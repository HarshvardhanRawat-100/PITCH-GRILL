#!/usr/bin/env python3
"""
Generate demo/decks/bolbot_clean.pdf using ReportLab.
10 slides in landscape orientation with clean, professional corporate design.
"""
import os

from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# Palette: Navy dark theme with professional contrast
BG_DARK = colors.HexColor("#0B132B")
BG_CARD = colors.HexColor("#1C2541")
ACCENT_BLUE = colors.HexColor("#48CAE4")
ACCENT_AMBER = colors.HexColor("#F59E0B")
TEXT_LIGHT = colors.HexColor("#F8F9FA")
TEXT_MUTED = colors.HexColor("#94A3B8")
BORDER_COLOR = colors.HexColor("#3A506B")
GREEN = colors.HexColor("#10B981")


class SlideCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.pages = []

    def showPage(self):
        self.pages.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self.pages)
        for page in self.pages:
            self.__dict__.update(page)
            self.draw_slide_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_slide_decorations(self, total_pages):
        width, height = self._pagesize
        # Background
        self.saveState()
        self.setFillColor(BG_DARK)
        self.rect(0, 0, width, height, fill=True, stroke=False)

        # Header bar
        self.setFillColor(ACCENT_BLUE)
        self.rect(0, height - 6, width, 6, fill=True, stroke=False)

        # Footer
        self.setFont("Helvetica-Bold", 9)
        self.setFillColor(ACCENT_BLUE)
        self.drawString(36, 24, "BolBot")
        self.setFont("Helvetica", 8)
        self.setFillColor(TEXT_MUTED)
        self.drawString(80, 24, "— WhatsApp AI Sales Assistant for Indian SMEs | Confidential Pitch Deck")

        # Slide Number
        page_num_str = f"{self._pageNumber} / {total_pages}"
        self.drawRightString(width - 36, 24, page_num_str)
        self.restoreState()


def build_deck():
    output_path = os.path.normpath(
        os.path.join(os.path.dirname(__file__), "..", "demo", "decks", "bolbot_clean.pdf")
    )
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    page_width, page_height = landscape(letter)
    doc = SimpleDocTemplate(
        output_path,
        pagesize=(page_width, page_height),
        leftMargin=36,
        rightMargin=36,
        topMargin=40,
        bottomMargin=45,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "CoverTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=32,
        leading=38,
        textColor=TEXT_LIGHT,
        alignment=0,
    )
    subtitle_style = ParagraphStyle(
        "CoverSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=15,
        leading=20,
        textColor=ACCENT_BLUE,
    )
    slide_header_style = ParagraphStyle(
        "SlideHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=TEXT_LIGHT,
    )
    slide_category_style = ParagraphStyle(
        "SlideCategory",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=12,
        textColor=ACCENT_AMBER,
        textTransform="uppercase",
    )
    card_title_style = ParagraphStyle(
        "CardTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=ACCENT_BLUE,
    )
    card_body_style = ParagraphStyle(
        "CardBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=TEXT_LIGHT,
    )
    metric_num_style = ParagraphStyle(
        "MetricNum",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=26,
        textColor=ACCENT_BLUE,
    )
    metric_label_style = ParagraphStyle(
        "MetricLabel",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=TEXT_MUTED,
    )

    story = []

    def make_card(title_text, body_text, width=340, height=130):
        content = [
            Paragraph(title_text, card_title_style),
            Spacer(1, 6),
            Paragraph(body_text, card_body_style),
        ]
        t = Table([[content]], colWidths=[width])
        t.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), BG_CARD),
                ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
                ("PADDING", (0, 0), (-1, -1), 12),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ])
        )
        return t

    def make_metric_card(num_text, label_text, width=170):
        content = [
            Paragraph(num_text, metric_num_style),
            Spacer(1, 4),
            Paragraph(label_text, metric_label_style),
        ]
        t = Table([[content]], colWidths=[width])
        t.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), BG_CARD),
                ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
                ("PADDING", (0, 0), (-1, -1), 10),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ])
        )
        return t

    # -------------------------------------------------------------
    # SLIDE 1: Title
    # -------------------------------------------------------------
    story.append(Spacer(1, 40))
    story.append(Paragraph("SEED ROUND INVESTOR PRESENTATION", slide_category_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph("BolBot", title_style))
    story.append(Spacer(1, 8))
    story.append(
        Paragraph(
            "WhatsApp AI Sales Assistant for Indian SMEs",
            subtitle_style,
        )
    )
    story.append(Spacer(1, 20))
    story.append(
        Paragraph(
            "Enabling 63M Indian merchants to qualify leads, display catalogs, and close orders 24/7 in vernacular languages.",
            card_body_style,
        )
    )
    story.append(Spacer(1, 40))

    meta_table = Table(
        [
            [
                Paragraph("<b>Website:</b> https://bolbot.in", card_body_style),
                Paragraph("<b>Stage:</b> Seed", card_body_style),
                Paragraph("<b>Target Ask:</b> ₹3.5 Crore", card_body_style),
                Paragraph("<b>HQ:</b> Bengaluru, India", card_body_style),
            ]
        ],
        colWidths=[180, 160, 180, 180],
    )
    meta_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), BG_CARD),
            ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
            ("PADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(meta_table)
    story.append(PageBreak())

    # -------------------------------------------------------------
    # SLIDE 2: Problem
    # -------------------------------------------------------------
    story.append(Paragraph("THE MARKET CHALLENGE", slide_category_style))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Indian SMEs Lose 60%+ Inbound Leads on WhatsApp", slide_header_style))
    story.append(Spacer(1, 25))

    p1 = make_card(
        "Late Evening Inquiries Abandoned",
        "Over 65% of customer inquiries on WhatsApp arrive after 7 PM. Sole proprietors and small sales teams cannot respond until the next morning, causing 80% lead drop-off.",
        340,
    )
    p2 = make_card(
        "Repetitive Manual Catalog Sharing",
        "Merchants waste 3+ hours daily sending static PDFs and pricing screenshots manually. Customers get frustrated waiting for basic product specifications and stock status.",
        340,
    )
    p3 = make_card(
        "Language & Dialect Barriers",
        "Over 70% of Bharat buyers prefer communicating in Hindi, Hinglish, Tamil, or Telugu. Existing bot builders only support formal English templates.",
        340,
    )
    p4 = make_card(
        "Payment Drop-off in Chat",
        "Without embedded UPI payment link generation and automated receipt confirmation, customers abandon intent before opening a banking app.",
        340,
    )

    t_prob = Table([[p1, p2], [p3, p4]], colWidths=[360, 360])
    t_prob.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("BOTTOMPADDING", (0, 0), (-1, -1), 16)]))
    story.append(t_prob)
    story.append(PageBreak())

    # -------------------------------------------------------------
    # SLIDE 3: Solution
    # -------------------------------------------------------------
    story.append(Paragraph("THE AUTONOMOUS AGENT", slide_category_style))
    story.append(Spacer(1, 6))
    story.append(Paragraph("BolBot: 24/7 Vernacular AI Sales Rep in WhatsApp", slide_header_style))
    story.append(Spacer(1, 25))

    s1 = make_card(
        "Zero-Latency Lead Qualification",
        "Responds in under 3 seconds on official WhatsApp Business API. Understands slang, voice notes, and vernacular text across 8 Indian languages.",
        340,
    )
    s2 = make_card(
        "Interactive Digital Catalogs",
        "Renders rich WhatsApp native carousels and lists directly from the merchant's inventory or Shopify/Zoho store without leaving chat.",
        340,
    )
    s3 = make_card(
        "One-Click UPI Checkout Links",
        "Generates dynamic Razorpay and Cashfree UPI payment links. Automatically tracks payment completion and generates GST invoices.",
        340,
    )
    s4 = make_card(
        "Intelligent Human Handoff",
        "Flags high-intent bulk B2B purchase orders and routes live alert notifications to the business owner via SMS and push alerts.",
        340,
    )

    t_sol = Table([[s1, s2], [s3, s4]], colWidths=[360, 360])
    t_sol.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("BOTTOMPADDING", (0, 0), (-1, -1), 16)]))
    story.append(t_sol)
    story.append(PageBreak())

    # -------------------------------------------------------------
    # SLIDE 4: Product & Architecture
    # -------------------------------------------------------------
    story.append(Paragraph("PRODUCT & ARCHITECTURE", slide_category_style))
    story.append(Spacer(1, 6))
    story.append(Paragraph("End-to-End Autonomous Commerce Pipeline", slide_header_style))
    story.append(Spacer(1, 25))

    flow_table = Table(
        [
            [
                make_metric_card("Step 1", "Inbound WhatsApp message received by Meta Cloud API webhook", 165),
                make_metric_card("Step 2", "BolBot Hybrid LLM intent parser classifies buyer stage & dialect", 165),
                make_metric_card("Step 3", "Dynamic catalog search & instant WhatsApp interactive card response", 165),
                make_metric_card("Step 4", "Razorpay UPI link issued; order synced to Zoho / Tally / Shopify", 165),
            ]
        ],
        colWidths=[175, 175, 175, 175],
    )
    flow_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(flow_table)
    story.append(Spacer(1, 30))

    tech_card = make_card(
        "Proprietary Vernacular ML Stack & Safe Architecture",
        "• Fine-tuned 8B parameter multilingual SLM running with sub-200ms latency.<br/>"
        "• Direct integration with Meta Cloud API, Tally Prime, Zoho Books, and Razorpay.<br/>"
        "• Codebase & SDK available: https://github.com/bolbot-ai/bolbot-core<br/>"
        "• Live production portal serving paying customers: https://bolbot.in",
        715,
    )
    story.append(tech_card)
    story.append(PageBreak())

    # -------------------------------------------------------------
    # SLIDE 5: Market Opportunity
    # -------------------------------------------------------------
    story.append(Paragraph("MARKET OPPORTUNITY", slide_category_style))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Capturing Bharat's ₹500 Crore Conversational Commerce Market", slide_header_style))
    story.append(Spacer(1, 25))

    m_row1 = Table(
        [
            [
                make_metric_card("₹500 Crore", "Total Addressable Market (TAM) for Indian SME WhatsApp AI SaaS", 230),
                make_metric_card("63 Million", "MSMEs in India seeking low-code digital sales automation", 230),
                make_metric_card("15 Million", "Active merchants transacting on WhatsApp Business daily", 230),
            ]
        ],
        colWidths=[240, 240, 240],
    )
    m_row1.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(m_row1)
    story.append(Spacer(1, 20))

    tam_desc = make_card(
        "TAM & Market Growth Dynamics",
        "• <b>Market Claim:</b> ₹500 crore market for SME conversational sales enablement software in India.<br/>"
        "• <b>Sector Tailwinds:</b> Digital commerce penetration among Tier-2/3 retail growing at 35% CAGR.<br/>"
        "• <b>Serviceable Obtainable Market (SOM):</b> 200,000 high-growth D2C, apparel, hardware, and electronics sellers.<br/>"
        "• <b>UPI Ecosystem Growth:</b> 14 Billion monthly UPI transactions provide frictionless payment infrastructure.",
        715,
    )
    story.append(tam_desc)
    story.append(PageBreak())

    # -------------------------------------------------------------
    # SLIDE 6: Competition
    # -------------------------------------------------------------
    story.append(Paragraph("COMPETITIVE LANDSCAPE", slide_category_style))
    story.append(Spacer(1, 6))
    story.append(Paragraph("No Direct Competitors in Vernacular Autonomous AI Sales", slide_header_style))
    story.append(Spacer(1, 20))

    comp_summary = make_card(
        "Market Positioning",
        "<b>Deck Claim:</b> No direct competitors in vernacular WhatsApp AI sales assistants for Indian SMEs.<br/>"
        "Legacy tools like Wati and Interakt are adjacent helpdesk and broadcast software that require human staffing. "
        "BolBot is the first autonomous agent that drives full conversation-to-checkout closure.",
        715,
    )
    story.append(comp_summary)
    story.append(Spacer(1, 15))

    c_table = Table(
        [
            [
                Paragraph("<b>Feature / Capability</b>", card_title_style),
                Paragraph("<b>BolBot</b>", card_title_style),
                Paragraph("<b>Wati / Interakt (BSPs)</b>", card_title_style),
                Paragraph("<b>ManyChat / US Agents</b>", card_title_style),
            ],
            [
                Paragraph("Primary Use Case", card_body_style),
                Paragraph("<font color='#10B981'><b>Autonomous Sales & Closing</b></font>", card_body_style),
                Paragraph("Support Desk & Broadcasts", card_body_style),
                Paragraph("Instagram / Messenger Funnels", card_body_style),
            ],
            [
                Paragraph("Vernacular Understanding", card_body_style),
                Paragraph("<font color='#10B981'><b>8 Indian Languages + Voice</b></font>", card_body_style),
                Paragraph("Rule-based English/Hindi keywords", card_body_style),
                Paragraph("English only", card_body_style),
            ],
            [
                Paragraph("UPI / Razorpay Checkout", card_body_style),
                Paragraph("<font color='#10B981'><b>Native in-chat link & confirm</b></font>", card_body_style),
                Paragraph("Manual external links", card_body_style),
                Paragraph("Stripe / PayPal only", card_body_style),
            ],
            [
                Paragraph("Requires Human Operators", card_body_style),
                Paragraph("<font color='#10B981'><b>No (Fully Autonomous)</b></font>", card_body_style),
                Paragraph("Yes (Heavy human staffing)", card_body_style),
                Paragraph("Partial", card_body_style),
            ],
        ],
        colWidths=[180, 180, 180, 180],
    )
    c_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), BG_CARD),
            ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("PADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ])
    )
    story.append(c_table)
    story.append(PageBreak())

    # -------------------------------------------------------------
    # SLIDE 7: Business Model & Pricing
    # -------------------------------------------------------------
    story.append(Paragraph("BUSINESS MODEL", slide_category_style))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Tiered SaaS Subscriptions with High Expansion Revenue", slide_header_style))
    story.append(Spacer(1, 25))

    bm_intro = make_card(
        "ARPU & Revenue Structure",
        "• <b>Average Revenue Per User (ARPU):</b> <b>₹2,499 per month</b> across active paying merchants.<br/>"
        "• <b>Gross Margin:</b> <b>68%</b> after WhatsApp Cloud API conversation fees and GPU inference costs.<br/>"
        "• <b>Contract Duration:</b> Annual prepaid contracts (with 15% discount) and monthly rolling options.",
        715,
    )
    story.append(bm_intro)
    story.append(Spacer(1, 20))

    t1 = make_card(
        "Starter Plan — ₹999/mo",
        "• Up to 500 conversations/mo<br/>• Catalog lookup & basic FAQ<br/>• Hindi & English AI<br/>• Email support",
        230,
    )
    t2 = make_card(
        "Growth Plan — ₹2,499/mo",
        "• Up to 2,500 conversations/mo<br/>• Full UPI payment integration<br/>• 8 Vernacular languages<br/>• CRM & Tally webhooks",
        230,
    )
    t3 = make_card(
        "Pro Enterprise — ₹4,999/mo",
        "• Unlimited conversations<br/>• Custom catalog AI embeddings<br/>• Dedicated account manager<br/>• Multi-agent routing",
        230,
    )

    tiers_table = Table([[t1, t2, t3]], colWidths=[240, 240, 240])
    tiers_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(tiers_table)
    story.append(PageBreak())

    # -------------------------------------------------------------
    # SLIDE 8: Traction & Unit Economics
    # -------------------------------------------------------------
    story.append(Paragraph("TRACTION & UNIT ECONOMICS", slide_category_style))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Demonstrated Product-Market Fit with Strong Unit Economics", slide_header_style))
    story.append(Spacer(1, 20))

    metrics_row = Table(
        [
            [
                make_metric_card("127", "Current Paying SME Customers", 170),
                make_metric_card("35 / mo", "New Paying Customers Added Monthly", 170),
                make_metric_card("8.0%", "Month-over-Month Customer Growth", 170),
                make_metric_card("₹7,000", "Customer Acquisition Cost (CAC)", 170),
            ]
        ],
        colWidths=[180, 180, 180, 180],
    )
    metrics_row.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(metrics_row)
    story.append(Spacer(1, 15))

    metrics_row2 = Table(
        [
            [
                make_metric_card("₹2,499", "Average Monthly ARPU per Customer", 170),
                make_metric_card("68.0%", "Gross Margin Percentage", 170),
                make_metric_card("4.5%", "Monthly Customer Churn Rate", 170),
                make_metric_card("5.4x", "LTV : CAC Ratio (₹37,762 LTV)", 170),
            ]
        ],
        colWidths=[180, 180, 180, 180],
    )
    metrics_row2.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(metrics_row2)
    story.append(Spacer(1, 15))

    traction_narrative = make_card(
        "Unit Economics Summary & Burn Profile",
        "• <b>Customer Lifetime Value (LTV):</b> ₹37,762 (ARPU ₹2,499 × 68% Gross Margin ÷ 4.5% Monthly Churn).<br/>"
        "• <b>CAC Payback:</b> 4.1 Months (₹7,000 CAC ÷ ₹1,700 Monthly Gross Profit).<br/>"
        "• <b>Fixed Operating Expense:</b> ₹22,44,000 per month (Engineering payroll, infrastructure, office, ops).<br/>"
        "• <b>Organic Channel Synergy:</b> 40% of inbound SME signups originate via 'Powered by BolBot' WhatsApp footer tags.",
        715,
    )
    story.append(traction_narrative)
    story.append(PageBreak())

    # -------------------------------------------------------------
    # SLIDE 9: Founding Team
    # -------------------------------------------------------------
    story.append(Paragraph("FOUNDING TEAM", slide_category_style))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Deep Domain Expertise Across Indian Fintech & AI", slide_header_style))
    story.append(Spacer(1, 25))

    m1 = make_card(
        "Aarav Sharma — CEO & Co-Founder",
        "• 8+ years scaling Indian B2B fintech.<br/>"
        "• Ex-Razorpay SMB Sales Lead; scaled payments adoption to 40,000+ merchants.<br/>"
        "• MBA from IIM Ahmedabad, B.Tech from IIT Delhi.",
        230,
    )
    m2 = make_card(
        "Dr. Priya Nair — CTO & Co-Founder",
        "• 10+ years NLP & Conversational AI research.<br/>"
        "• Ex-Flipkart Conversational AI Research Scientist; 6 published ACL/EMNLP papers.<br/>"
        "• Ph.D. in Computer Science from IIT Bombay.",
        230,
    )
    m3 = make_card(
        "Rohan Gupta — COO & Co-Founder",
        "• 7+ years marketplace and merchant ops.<br/>"
        "• Ex-Swiggy Logistics Regional Operations Lead; managed 15,000+ delivery partners.<br/>"
        "• B.E. from BITS Pilani.",
        230,
    )

    team_table = Table([[m1, m2, m3]], colWidths=[240, 240, 240])
    team_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(team_table)
    story.append(Spacer(1, 20))

    team_footer = make_card(
        "Engineering & Advisory Bench",
        "Supported by 5 senior engineers in Bengaluru with backgrounds from PhonePe, Freshworks, and Myntra. "
        "Advised by former SaaS founders and active angel investors in India's B2B tech ecosystem.",
        715,
    )
    story.append(team_footer)
    story.append(PageBreak())

    # -------------------------------------------------------------
    # SLIDE 10: The Ask & Runway
    # -------------------------------------------------------------
    story.append(Paragraph("THE SEED INVESTMENT", slide_category_style))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Raising ₹3.5 Crore Seed Round for 18-Month Runway", slide_header_style))
    story.append(Spacer(1, 25))

    ask_metrics = Table(
        [
            [
                make_metric_card("₹3.5 Crore", "Capital Raise Target ($420,000 USD)", 230),
                make_metric_card("18 Months", "Post-Round Operating Runway", 230),
                make_metric_card("1,200", "Target Paying SMEs at Month 18", 230),
            ]
        ],
        colWidths=[240, 240, 240],
    )
    ask_metrics.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(ask_metrics)
    story.append(Spacer(1, 25))

    u1 = make_card(
        "50% Engineering & AI Infrastructure",
        "• Expand proprietary SLM fine-tuning for regional Indian dialects.<br/>"
        "• Secure enterprise GPU cluster capacity on Google Cloud / Gemini API.<br/>"
        "• Deepen Tally Prime and Marg ERP integrations.",
        230,
    )
    u2 = make_card(
        "30% GTM & Merchant Acquisition",
        "• Hire direct field sales captains in Surat, Tirupur, Jaipur, and Ludhiana.<br/>"
        "• Trade association partnerships with CA / GST consultant networks.<br/>"
        "• Target customer acquisition of 35-150 new merchants/month.",
        230,
    )
    u3 = make_card(
        "20% Operations & Compliance",
        "• RBI and DPDP Act 2023 compliance audits.<br/>"
        "• Merchant onboarding and vernacular customer support team.<br/>"
        "• Working capital buffer for Meta BSP billing requirements.",
        230,
    )

    funds_table = Table([[u1, u2, u3]], colWidths=[240, 240, 240])
    funds_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(funds_table)

    # Build document
    doc.build(story, canvasmaker=SlideCanvas)
    print(f"Successfully generated {output_path}")


if __name__ == "__main__":
    build_deck()
