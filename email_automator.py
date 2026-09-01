"""
=============================================================================
GEMINI AI PERSONALIZED EMAIL AUTOMATOR (GMAIL SMTP + CHECKPOINT LOGGING)
=============================================================================
Description:
    Interactive Python email automation system with Gemini AI personalization.
    - Interactive startup wizard (Company name, Sender email, Pitch, Attachments/Logo)
    - Pre-send confirmation preview with sample rendering
    - Secure SMTP authentication with hidden credential input (getpass)
    - Resume checkpointing ('sent_log.csv') & anti-spam rate pacing
=============================================================================
"""

import os
import sys
import time
import re
import csv
import ssl
import json
import smtplib
import random
import logging
import argparse
import getpass
import mimetypes
from datetime import datetime
from email import encoders
from email.mime.base import MIMEBase
from email.mime.image import MIMEImage
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, List, Set, Tuple, Optional

# Third-party imports with fallback handling
try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    from google import genai
    from google.genai import types
    HAS_GENAI = True
except ImportError:
    try:
        import google.generativeai as genai_legacy
        HAS_GENAI = True
    except ImportError:
        HAS_GENAI = False

# Configure Console & File Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("email_automator.log", encoding="utf-8")
    ]
)
logger = logging.getLogger("EmailAutomator")

# -----------------------------------------------------------------------------
# CONSTANTS & DEFAULTS
# -----------------------------------------------------------------------------
DEFAULT_CONTACTS_FILE = os.getenv("CONTACTS_FILE", "contacts.xlsx")
DEFAULT_SENT_LOG_FILE = os.getenv("SENT_LOG_FILE", "sent_log.csv")
DEFAULT_DRY_RUN_OUTPUT = os.getenv("DRY_RUN_OUTPUT_FILE", "dry_run_emails.txt")

DEFAULT_SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
DEFAULT_SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
DEFAULT_WAIT_TIMER = float(os.getenv("WAIT_TIMER_SECONDS", "36.0"))
TIMER_JITTER_RANGE = (1.0, 4.0)

# Unsubscribe Footer Text
UNSUBSCRIBE_FOOTER = (
    "\n\n---\n"
    "Unsubscribe: If you prefer not to receive future updates from me, "
    "simply reply with 'unsubscribe' and I will promptly remove your address."
)

# Immutable Exact Placeholders (Guaranteed never to be hallucinated by Gemini)
EXACT_PLACEHOLDERS: Dict[str, str] = {
    "{{CALENDAR_URL}}": os.getenv("CALENDAR_URL", "https://calendly.com/your-team/15min"),
    "{{RESOURCE_LINK}}": os.getenv("RESOURCE_LINK", "https://example.com/case-study"),
    "{{DEMO_DATE}}": os.getenv("DEMO_DATE", "Thursday at 2:00 PM EST"),
    "{{COMPANY_WEBSITE}}": os.getenv("COMPANY_WEBSITE", "https://apexdynamics.ai"),
}

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


def validate_email(email_str: str) -> bool:
    """Check if an email address is syntactically valid."""
    if not isinstance(email_str, str):
        return False
    return bool(EMAIL_REGEX.match(email_str.strip()))


def mask_placeholders(text: str) -> str:
    """Inject protected placeholder values into text after AI generation."""
    for token, real_val in EXACT_PLACEHOLDERS.items():
        text = text.replace(token, real_val)
    return text


def load_sent_log(filepath: str) -> Set[str]:
    """Reads 'sent_log.csv' checkpoint file to identify already-processed emails."""
    processed_emails: Set[str] = set()
    if not os.path.exists(filepath):
        with open(filepath, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["timestamp", "email", "name", "status", "subject", "error_message"])
        return processed_emails

    try:
        with open(filepath, mode="r", newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get("status") in ("SENT", "DRY_RUN") and row.get("email"):
                    processed_emails.add(row["email"].strip().lower())
    except Exception as e:
        logger.warning(f"Could not read checkpoint log '{filepath}': {e}. Starting fresh.")

    return processed_emails


def append_sent_log(
    filepath: str,
    email: str,
    name: str,
    status: str,
    subject: str,
    error_msg: str = ""
) -> None:
    """Appends a record to the 'sent_log.csv' checkpoint file immediately."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(filepath, mode="a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([timestamp, email, name, status, subject, error_msg])


# -----------------------------------------------------------------------------
# ATTACHMENT & LOGO HANDLER
# -----------------------------------------------------------------------------
def attach_file_to_message(msg: MIMEMultipart, file_path: str) -> bool:
    """Attaches a local file or company logo to a MIMEMultipart email message."""
    if not os.path.isfile(file_path):
        logger.error(f"Attachment file not found: {file_path}")
        return False

    filename = os.path.basename(file_path)
    ctype, encoding = mimetypes.guess_type(file_path)
    if ctype is None or encoding is not None:
        ctype = "application/octet-stream"

    maintype, subtype = ctype.split("/", 1)

    try:
        with open(file_path, "rb") as fp:
            file_data = fp.read()

        if maintype == "image":
            part = MIMEImage(file_data, _subtype=subtype)
            part.add_header("Content-ID", f"<{filename}>")
            part.add_header("Content-Disposition", "attachment", filename=filename)
        else:
            part = MIMEBase(maintype, subtype)
            part.set_payload(file_data)
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", "attachment", filename=filename)

        msg.attach(part)
        return True
    except Exception as e:
        logger.error(f"Failed to attach file '{file_path}': {e}")
        return False


# -----------------------------------------------------------------------------
# GEMINI EMAIL GENERATOR
# -----------------------------------------------------------------------------
class GeminiEmailGenerator:
    """Handles prompt construction and resilient generation via Gemini API."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if self.api_key and HAS_GENAI:
            try:
                self.client = genai.Client(api_key=self.api_key)
                self.model_name = "gemini-3.7-flash"
                self.active = True
            except Exception:
                self.active = False
        else:
            self.active = False

    def generate_personalized_email(
        self,
        name: str,
        custom_context: str,
        sender_name: str,
        sender_company: str,
        campaign_goal: str,
        tone: str = "Professional, warm, concise, and value-focused",
        max_retries: int = 3
    ) -> Tuple[str, str]:
        """Generates a hyper-personalized email subject and body using Gemini API or template fallback."""
        if not self.active:
            # Smart deterministic fallback when Gemini API key is not present in local CLI
            first_name = name.split()[0] if name else "there"
            subject = f"Quick intro regarding {custom_context.split('.')[0] if custom_context else sender_company}"
            body = (
                f"Hi {first_name},\n\n"
                f"I came across your work and noted your focus on {custom_context if custom_context else 'industry leadership'}.\n\n"
                f"At {sender_company}, {campaign_goal}.\n\n"
                f"Would you be open to a brief 15-minute conversation next week to explore ideas?\n\n"
                f"Best regards,\n\n"
                f"{sender_name}\n"
                f"{sender_company}"
            )
            body = mask_placeholders(body)
            if UNSUBSCRIBE_FOOTER and "unsubscribe" not in body.lower():
                body = f"{body}{UNSUBSCRIBE_FOOTER}"
            return subject, body

        placeholder_bullets = "\n".join(
            [f"  - Use token '{k}' for referencing {k.strip('{}')}" for k in EXACT_PLACEHOLDERS.keys()]
        )

        system_instruction = (
            "You are an elite, consultative outreach copywriter. Your goal is to draft "
            "a highly personalized, human, 1-on-1 cold email based strictly on the recipient's "
            "custom context. The email MUST feel individually handcrafted, not like a template."
        )

        prompt = f"""Write an individualized outreach email for the following recipient:

Recipient Information:
- Full Name: {name}
- Specific Context & Background: {custom_context if custom_context else 'Industry professional'}

Sender Details:
- Name: {sender_name}
- Organization: {sender_company}
- Value Proposition / Objective: {campaign_goal}
- Desired Tone: {tone}

STRICT INSTRUCTIONS:
1. SUBJECT LINE: Create an engaging, hyper-relevant, unique subject line (under 8 words).
   DO NOT use spam words (e.g., 'QUICK QUESTION', 'FREE', 'ACT NOW', 'URGENT', 'SYNERGY').
2. RECIPIENT NAME: Address the recipient by their natural first name at the beginning.
3. CONTEXT INTEGRATION: Naturally tie in their specific 'Custom Context' in the first two sentences.
4. EXACT PLACEHOLDERS: If referencing a calendar link, demo date, or website, you MUST use these exact token placeholders WITHOUT modifying characters or casing:
{placeholder_bullets}
5. BREVITY: Keep body between 80 and 140 words.
6. FORMATTING: Return ONLY a valid JSON object matching this schema:
{{
  "subject": "Unique personalized subject line",
  "body": "Personalized body text with appropriate paragraph line breaks"
}}
"""

        for attempt in range(1, max_retries + 1):
            try:
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        temperature=0.7,
                    )
                )

                raw_text = response.text.strip()
                data = json.loads(raw_text)

                subject = data.get("subject", "").strip()
                body = data.get("body", "").strip()

                if not subject or not body:
                    raise ValueError("Gemini returned empty subject or body.")

                body = mask_placeholders(body)
                subject = mask_placeholders(subject)

                if UNSUBSCRIBE_FOOTER and "unsubscribe" not in body.lower():
                    body = f"{body}{UNSUBSCRIBE_FOOTER}"

                return subject, body

            except Exception as exc:
                logger.warning(f"Gemini API attempt {attempt}/{max_retries} failed for '{name}': {exc}")
                if attempt < max_retries:
                    time.sleep(2 ** attempt + random.uniform(0.5, 1.5))
                else:
                    raise RuntimeError(f"Exceeded max Gemini API retries for '{name}': {exc}")


# -----------------------------------------------------------------------------
# SECURE GMAIL SMTP DISPATCHER
# -----------------------------------------------------------------------------
class GmailSMTPDispatcher:
    """Manages secure TLS/SSL connection and email dispatch via Gmail SMTP."""

    def __init__(self, user: str, app_password: str, host: str = DEFAULT_SMTP_HOST, port: int = DEFAULT_SMTP_PORT):
        self.user = user.strip()
        self.app_password = app_password.strip().replace(" ", "")
        self.host = host
        self.port = port
        if not self.user or not self.app_password:
            raise ValueError("Sender email and SMTP App Password are required for live authentication.")

    def test_connection(self) -> Tuple[bool, str]:
        """Diagnostic Test: Verifies SSL authentication with Gmail SMTP."""
        try:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(self.host, self.port, context=context, timeout=12) as server:
                server.ehlo()
                server.login(self.user, self.app_password)
                return True, f"Authentication successful on {self.host}:{self.port} as '{self.user}'."
        except smtplib.SMTPAuthenticationError as e:
            return False, f"SMTP Authentication Error (535): Invalid user credentials or 16-char App Password. Details: {e}"
        except smtplib.SMTPConnectError as e:
            return False, f"SMTP Connection Error: Unable to reach {self.host}:{self.port}. Verify network/firewall settings."
        except Exception as e:
            return False, f"SMTP Connection Diagnostic Failed: {str(e)}"

    def send_email(
        self,
        recipient_email: str,
        sender_name: str,
        subject: str,
        body_text: str,
        attachments: Optional[List[str]] = None
    ) -> None:
        """Sends an email with SSL security and optional attachments to the recipient."""
        msg = MIMEMultipart("mixed")
        msg["From"] = f"{sender_name} <{self.user}>"
        msg["To"] = recipient_email
        msg["Subject"] = subject
        msg["Date"] = datetime.now().strftime("%a, %d %b %Y %H:%M:%S %z")

        # Inner text alternative container
        alt_part = MIMEMultipart("alternative")
        alt_part.attach(MIMEText(body_text, "plain", "utf-8"))
        msg.attach(alt_part)

        # Attach files / company logo
        if attachments:
            for attach_path in attachments:
                if os.path.isfile(attach_path):
                    attach_file_to_message(msg, attach_path)

        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(self.host, self.port, context=context) as server:
            server.login(self.user, self.app_password)
            server.sendmail(self.user, [recipient_email], msg.as_string())


# -----------------------------------------------------------------------------
# INTERACTIVE STARTUP WIZARD
# -----------------------------------------------------------------------------
def prompt_interactive_configuration(
    default_company: str,
    default_sender_name: str,
    default_sender_email: str,
    default_goal: str,
    is_dry_run: bool
) -> Tuple[str, str, str, str, List[str], Optional[str]]:
    """
    Prompts the user interactively on CLI startup for:
    - Company Name
    - Sender Full Name
    - Sender Email
    - Main Message Body / Campaign Goal
    - Attachments or Company Logo
    - Secure SMTP Password (with getpass hidden input)
    """
    print("\n" + "=" * 68)
    print(" 🚀 GEMINI AI PERSONALIZED EMAIL AUTOMATOR — INTERACTIVE STARTUP")
    print("=" * 68)
    print(" Please provide or confirm your campaign details below:")
    print("-" * 68)

    # 1. Company Name
    company_input = input(f" [1/5] Company Name [{default_company}]: ").strip()
    company_name = company_input if company_input else default_company

    # 2. Sender Full Name
    name_input = input(f" [2/5] Sender Full Name [{default_sender_name}]: ").strip()
    sender_name = name_input if name_input else default_sender_name

    # 3. Sender Email
    email_prompt = f" [{default_sender_email}]" if default_sender_email else ""
    while True:
        email_input = input(f" [3/5] Sender Email Address{email_prompt}: ").strip()
        sender_email = email_input if email_input else default_sender_email
        if sender_email and validate_email(sender_email):
            break
        print("   ⚠️  Invalid email address format. Please enter a valid email.")

    # 4. Main Message Body / Campaign Pitch
    print(f"\n [4/5] Main Message Body / Value Proposition:")
    print(f"       Default: \"{default_goal}\"")
    goal_input = input("       Enter custom pitch (or press Enter to use default): ").strip()
    campaign_goal = goal_input if goal_input else default_goal

    # 5. Attachments or Company Logo
    attachments: List[str] = []
    attach_choice = input("\n [5/5] Do you want to attach any files or a company logo? (y/N): ").strip().lower()
    if attach_choice in ("y", "yes"):
        print("       Enter file path(s) separated by commas (e.g., logo.png, brochure.pdf):")
        paths_input = input("       Attachment paths: ").strip()
        if paths_input:
            raw_paths = [p.strip() for p in paths_input.split(",") if p.strip()]
            for p in raw_paths:
                if os.path.isfile(p):
                    file_size_kb = os.path.getsize(p) / 1024
                    attachments.append(p)
                    print(f"       ✅ Attached: '{os.path.basename(p)}' ({file_size_kb:.1f} KB)")
                else:
                    print(f"       ⚠️  File not found on disk: '{p}' (Skipped)")

    # 6. Secure SMTP Login Password (if running live SMTP dispatch)
    smtp_password = None
    if not is_dry_run:
        env_password = os.getenv("GMAIL_APP_PASSWORD", "")
        if env_password:
            use_env = input(f"\n 🔑 Found GMAIL_APP_PASSWORD in environment. Use it? [Y/n]: ").strip().lower()
            if use_env not in ("n", "no"):
                smtp_password = env_password

        if not smtp_password:
            print("\n 🔒 SECURE SMTP AUTHENTICATION (Gmail App Password)")
            print("    Note: Input is hidden for security. Use a 16-char App Password from Google Account.")
            while not smtp_password:
                smtp_password = getpass.getpass("    Enter Gmail App Password: ").strip()
                if not smtp_password:
                    print("    ⚠️ Password cannot be empty.")

    return company_name, sender_name, sender_email, campaign_goal, attachments, smtp_password


# -----------------------------------------------------------------------------
# PRE-SEND CONFIRMATION PREVIEW
# -----------------------------------------------------------------------------
def display_presend_confirmation(
    company_name: str,
    sender_name: str,
    sender_email: str,
    campaign_goal: str,
    attachments: List[str],
    sample_recipient: Dict[str, str],
    sample_subject: str,
    sample_body: str,
    total_contacts: int,
    skipped_count: int,
    is_dry_run: bool,
    wait_timer: float
) -> bool:
    """
    Displays a comprehensive pre-send confirmation banner previewing the finalized
    message, recipient details, and configuration. Requires explicit approval.
    """
    print("\n" + "=" * 68)
    print(" 📋 PRE-SEND CONFIRMATION & RECIPIENT PREVIEW")
    print("=" * 68)
    print(f" SENDER:        {sender_name} <{sender_email}>")
    print(f" COMPANY:       {company_name}")
    print(f" DISPATCH MODE: {'DRY RUN (Safe Sandbox - No real emails sent)' if is_dry_run else 'LIVE GMAIL SMTP (smtp.gmail.com:465 SSL)'}")
    print(f" TOTAL QUEUE:   {total_contacts} contacts loaded ({skipped_count} already sent in checkpoint)")
    print(f" PACING TIMER:  {wait_timer}s / email (~{int(3600 / max(1, wait_timer))} emails/hr)")
    
    if attachments:
        attach_summary = ", ".join([f"{os.path.basename(a)} ({os.path.getsize(a)/1024:.1f} KB)" for a in attachments])
        print(f" ATTACHMENTS:   {attach_summary}")
    else:
        print(f" ATTACHMENTS:   None")

    print("\n" + "-" * 68)
    print(f" 🔍 SAMPLE EMAIL PREVIEW FOR RECIPIENT #1: {sample_recipient.get('Name')} <{sample_recipient.get('Email')}>")
    print("-" * 68)
    print(f" SUBJECT: {sample_subject}")
    if sample_recipient.get("CustomContext"):
        print(f" CONTEXT: {sample_recipient.get('CustomContext')}")
    print("\n BODY TEXT:")
    for line in sample_body.split("\n"):
        print(f"   {line}")
    print("-" * 68)

    prompt_text = " ⚠️  Do you approve and want to proceed with dispatch? [y/N]: "
    approval = input(prompt_text).strip().lower()
    return approval in ("y", "yes")


# -----------------------------------------------------------------------------
# CORE AUTOMATION ORCHESTRATION LOOP
# -----------------------------------------------------------------------------
def run_automation(
    contacts_file: str = DEFAULT_CONTACTS_FILE,
    dry_run: bool = False,
    wait_timer: float = DEFAULT_WAIT_TIMER,
    non_interactive: bool = False,
    auto_approve: bool = False
) -> None:
    """Main execution pipeline."""
    # 1. Verify Contacts File
    if not os.path.exists(contacts_file):
        logger.error(f"Contacts file '{contacts_file}' not found.")
        print(f"\n[!] Please place '{contacts_file}' in this directory (columns: Name, Email, CustomContext)")
        sys.exit(1)

    # 2. Read Contacts
    try:
        if contacts_file.endswith(".csv"):
            df = pd.read_csv(contacts_file) if HAS_PANDAS else []
        else:
            df = pd.read_excel(contacts_file) if HAS_PANDAS else []
    except Exception as e:
        logger.error(f"Failed to read '{contacts_file}': {e}")
        sys.exit(1)

    # Convert to list of dicts
    if HAS_PANDAS and isinstance(df, pd.DataFrame):
        contacts_list = df.to_dict(orient="records")
    else:
        # Fallback CSV reader if pandas is absent
        contacts_list = []
        with open(contacts_file, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            contacts_list = list(reader)

    if not contacts_list:
        logger.error("No contacts found in file.")
        sys.exit(1)

    # Defaults from Environment
    default_company = os.getenv("SENDER_COMPANY", "Apex Dynamics")
    default_name = os.getenv("SENDER_NAME", "Alex Morgan")
    default_email = os.getenv("GMAIL_USER", os.getenv("SENDER_EMAIL", ""))
    default_goal = os.getenv(
        "CAMPAIGN_GOAL",
        "Introduce our high-throughput AI infrastructure and propose a 15-minute introductory call."
    )

    # 3. Interactive Wizard (if interactive terminal and not bypassed)
    is_interactive = sys.stdin.isatty() and not non_interactive
    attachments: List[str] = []
    smtp_password: Optional[str] = os.getenv("GMAIL_APP_PASSWORD")

    if is_interactive:
        company_name, sender_name, sender_email, campaign_goal, attachments, pass_input = (
            prompt_interactive_configuration(
                default_company, default_name, default_email, default_goal, dry_run
            )
        )
        if pass_input:
            smtp_password = pass_input
    else:
        company_name = default_company
        sender_name = default_name
        sender_email = default_email
        campaign_goal = default_goal

    # 4. Checkpoint State
    sent_emails = load_sent_log(DEFAULT_SENT_LOG_FILE)
    total_contacts = len(contacts_list)
    skipped_count = sum(1 for c in contacts_list if str(c.get("Email", "")).strip().lower() in sent_emails)

    # 5. Initialize Generator & Generate Sample for Preview
    generator = GeminiEmailGenerator()
    first_contact = contacts_list[0]
    sample_name = str(first_contact.get("Name", "Prospect")).strip()
    sample_context = str(first_contact.get("CustomContext", "")).strip()

    logger.info(f"Rendering pre-send preview copy for {sample_name}...")
    sample_subject, sample_body = generator.generate_personalized_email(
        name=sample_name,
        custom_context=sample_context,
        sender_name=sender_name,
        sender_company=company_name,
        campaign_goal=campaign_goal
    )

    # 6. Pre-Send Confirmation
    if is_interactive and not auto_approve:
        approved = display_presend_confirmation(
            company_name=company_name,
            sender_name=sender_name,
            sender_email=sender_email,
            campaign_goal=campaign_goal,
            attachments=attachments,
            sample_recipient=first_contact,
            sample_subject=sample_subject,
            sample_body=sample_body,
            total_contacts=total_contacts,
            skipped_count=skipped_count,
            is_dry_run=dry_run,
            wait_timer=wait_timer
        )
        if not approved:
            print("\n [ABORTED] Dispatch cancelled by user. No emails were sent.\n")
            sys.exit(0)

    # 7. Secure SMTP Authentication Handshake (if Live Dispatch)
    dispatcher = None
    if not dry_run:
        if not smtp_password:
            logger.error("No SMTP password provided for live dispatch.")
            sys.exit(1)

        dispatcher = GmailSMTPDispatcher(
            user=sender_email,
            app_password=smtp_password,
            host=DEFAULT_SMTP_HOST,
            port=DEFAULT_SMTP_PORT
        )
        logger.info(f"Verifying SMTP SSL handshake with {DEFAULT_SMTP_HOST}:{DEFAULT_SMTP_PORT}...")
        ok, auth_msg = dispatcher.test_connection()
        if not ok:
            logger.error(f"[AUTH FAILED] {auth_msg}")
            print(f"\n❌ {auth_msg}\n")
            sys.exit(1)
        logger.info(f"✅ {auth_msg}")

    # 8. Execution Dispatcher Loop
    dry_run_file = None
    if dry_run:
        dry_run_file = open(DEFAULT_DRY_RUN_OUTPUT, "w", encoding="utf-8")
        dry_run_file.write(f"=== DRY RUN LOG [{datetime.now()}] ===\n")
        dry_run_file.write(f"Company: {company_name} | Sender: {sender_name} <{sender_email}>\n\n")

    success_count = 0
    actual_skipped = 0
    failed_count = 0

    print("\n" + "=" * 68)
    print(f" ▶ STARTING CAMPAIGN DISPATCH ({total_contacts} TOTAL RECIPIENTS)")
    print("=" * 68)

    try:
        for idx, contact in enumerate(contacts_list):
            name = str(contact.get("Name", "")).strip()
            email = str(contact.get("Email", "")).strip()
            context = str(contact.get("CustomContext", "")).strip()

            if not name or not email:
                continue

            normalized_email = email.lower()

            # Checkpoint Check
            if normalized_email in sent_emails:
                logger.info(f"[{idx+1}/{total_contacts}] Skipping '{email}' (already logged in {DEFAULT_SENT_LOG_FILE})")
                actual_skipped += 1
                continue

            if not validate_email(email):
                logger.warning(f"[{idx+1}/{total_contacts}] Invalid email '{email}'. Logging skip.")
                append_sent_log(DEFAULT_SENT_LOG_FILE, email, name, "SKIPPED", "N/A", "Invalid format")
                failed_count += 1
                continue

            logger.info(f"[{idx+1}/{total_contacts}] Personalizing copy for {name} ({email})...")

            # Use cached first sample for contact 0 to save API call
            if idx == 0 and sample_subject and sample_body:
                subject, body = sample_subject, sample_body
            else:
                try:
                    subject, body = generator.generate_personalized_email(
                        name=name,
                        custom_context=context,
                        sender_name=sender_name,
                        sender_company=company_name,
                        campaign_goal=campaign_goal
                    )
                except Exception as e:
                    logger.error(f"Generation error for {email}: {e}")
                    append_sent_log(DEFAULT_SENT_LOG_FILE, email, name, "FAILED", "N/A", str(e))
                    failed_count += 1
                    continue

            # Dispatch Mode
            if dry_run:
                logger.info(f"  [DRY RUN SAVED] Subject: '{subject}'")
                dry_run_file.write(f"====================================================\n")
                dry_run_file.write(f"TO: {name} <{email}>\n")
                dry_run_file.write(f"SUBJECT: {subject}\n")
                if attachments:
                    dry_run_file.write(f"ATTACHMENTS: {', '.join(attachments)}\n")
                dry_run_file.write(f"----------------------------------------------------\n")
                dry_run_file.write(f"{body}\n\n")
                dry_run_file.flush()

                append_sent_log(DEFAULT_SENT_LOG_FILE, email, name, "DRY_RUN", subject)
                success_count += 1
            else:
                try:
                    dispatcher.send_email(
                        recipient_email=email,
                        sender_name=sender_name,
                        subject=subject,
                        body_text=body,
                        attachments=attachments
                    )
                    logger.info(f"  [SENT] Live email delivered to {email} (Subject: '{subject}')")
                    append_sent_log(DEFAULT_SENT_LOG_FILE, email, name, "SENT", subject)
                    sent_emails.add(normalized_email)
                    success_count += 1
                except smtplib.SMTPAuthenticationError:
                    logger.error("Authentication expired or rejected. Terminating.")
                    append_sent_log(DEFAULT_SENT_LOG_FILE, email, name, "FAILED", subject, "Auth Error")
                    break
                except Exception as e:
                    logger.error(f"Dispatch error for {email}: {e}")
                    append_sent_log(DEFAULT_SENT_LOG_FILE, email, name, "FAILED", subject, str(e))
                    failed_count += 1
                    continue

            # Pacing Delay
            if idx < total_contacts - 1:
                jitter = random.uniform(*TIMER_JITTER_RANGE)
                actual_delay = wait_timer + jitter
                logger.info(f"  Pacing: Waiting {actual_delay:.1f}s before next contact...")
                time.sleep(actual_delay)

    except KeyboardInterrupt:
        logger.warning("\n[PAUSED] Process stopped by user (Ctrl+C). Checkpoint saved safely.")

    finally:
        if dry_run_file:
            dry_run_file.close()
            logger.info(f"Dry run email batch saved to '{DEFAULT_DRY_RUN_OUTPUT}'.")

    print("\n" + "=" * 68)
    print(" 🏁 CAMPAIGN EXECUTION COMPLETE")
    print(f" Successfully Processed: {success_count}")
    print(f" Checkpoint Skips:        {actual_skipped}")
    print(f" Failed / Invalid:       {failed_count}")
    print(f" Checkpoint Log:         {DEFAULT_SENT_LOG_FILE}")
    print("=" * 68 + "\n")


# -----------------------------------------------------------------------------
# CLI ENTRY POINT
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Gemini AI Personalized Email Automator with Interactive Wizard, SMTP SSL & Checkpoint Log."
    )
    parser.add_argument(
        "--file",
        "-f",
        default=DEFAULT_CONTACTS_FILE,
        help=f"Path to contacts spreadsheet (.xlsx or .csv). Default: '{DEFAULT_CONTACTS_FILE}'"
    )
    parser.add_argument(
        "--dry-run",
        "-d",
        action="store_true",
        help="Run in Dry Run simulation mode (no actual emails sent)."
    )
    parser.add_argument(
        "--wait",
        "-w",
        type=float,
        default=DEFAULT_WAIT_TIMER,
        help=f"Pacing delay in seconds between emails (default: {DEFAULT_WAIT_TIMER}s)."
    )
    parser.add_argument(
        "--non-interactive",
        action="store_true",
        help="Skip interactive startup wizard prompts and use environment variables."
    )
    parser.add_argument(
        "--yes",
        "-y",
        action="store_true",
        help="Automatically approve pre-send confirmation without prompting."
    )
    parser.add_argument(
        "--test-connection",
        "-t",
        action="store_true",
        help="Run diagnostic connection test to SMTP server."
    )

    args = parser.parse_args()

    if args.test_connection:
        test_user = os.getenv("GMAIL_USER", "")
        test_pass = os.getenv("GMAIL_APP_PASSWORD", "")
        if not test_user or not test_pass:
            print("[ERROR] Set GMAIL_USER and GMAIL_APP_PASSWORD in environment for diagnostic test.")
            sys.exit(1)
        dispatcher = GmailSMTPDispatcher(test_user, test_pass)
        ok, msg = dispatcher.test_connection()
        if ok:
            print(f"✅ {msg}")
            sys.exit(0)
        else:
            print(f"❌ {msg}")
            sys.exit(1)

    run_automation(
        contacts_file=args.file,
        dry_run=args.dry_run,
        wait_timer=args.wait,
        non_interactive=args.non_interactive,
        auto_approve=args.yes
    )
