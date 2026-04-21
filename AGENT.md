# 🚀 Project Master Brief: ResumeSync AI

**Role:** Senior Full-Stack Cloud Architect & AI Implementation Specialist  
**Objective:** Build a Career Engineering platform that uses a "Human-in-the-Loop" workflow to optimize resumes through targeted AI generation and professional template injection.

---

## 1. Core Logic: The "Middle Ground" Strategy

The system operates in two distinct transformation modes. The AI acts as the "Lead" by suggesting content, while the user acts as the "Editor" to verify and adjust metrics.

### 🛡️ Mode 1: General Polisher (Grounded)

- **Intent:** Professional credibility for general networking or LinkedIn.
- **Action:** Fixes passive voice, enhances keywords, and injects **grounded, plausible metrics** (e.g., 5–12% improvements).
- **Tone:** Credible, steady, and clean.

### 🎯 Mode 2: Sniper Mode (FAANG-Ready)

- **Intent:** High-stakes ATS dominance for specific applications.
- **Action:** Hyper-targets a specific Job Description. Injects **high-impact, elite metrics** (e.g., 20%+, significant cost/time savings) and performs 1:1 keyword mapping.
- **Tone:** Bold, high-performance, and results-oriented.

---

## 2. Technical Stack & Architecture

| Component           | Technology                        |
| :------------------ | :-------------------------------- |
| **Frontend**        | React (Vite) + Tailwind CSS       |
| **Backend**         | FastAPI (Python) + Docker         |
| **Hosting (Web)**   | AWS Amplify                       |
| **Compute**         | AWS ECS Fargate + ECR             |
| **Auth**            | AWS Cognito                       |
| **Storage**         | Amazon S3 (Private Access Levels) |
| **Document Engine** | `docxtpl` (Python/Jinja2)         |

### AI Access Tiers:

- **Free Tier (BYOK):** User provides their own API Key (Gemini/OpenAI/Anthropic) stored in browser `localStorage`.
- **Premium Tier:** Managed **AWS Bedrock** (Claude 3.5) Multi-Agent workflow.

---

## 3. The Document Engine (Critical)

**NO raw XML hacking.** To ensure 100% formatting integrity and ATS readability:

1.  **Templates:** The system uses 5 pre-designed, ATS-optimized `.docx` templates.
2.  **Logic:** The AI outputs structured **JSON**.
3.  **Rendering:** The backend uses the **`docxtpl`** library to inject the JSON into Word placeholders (e.g., `{{ summary }}`, `{{ experience_list }}`).
4.  **Result:** The final download is a perfectly formatted document that matches the chosen template regardless of the original file's quality.

---

## 4. User Interface Flow

1.  **Auth:** Login/Sign-Up (Cognito) to access the S3 "Resume Drive."
2.  **Ingestion:** Upload a `.docx` (data extraction only) or select a saved version from S3.
3.  **Targeting:** Select **Polisher** or **Sniper** mode (and paste JD if Sniper).
4.  **The Diff Editor:** A side-by-side React view where AI-generated metrics are highlighted. Users **must** be able to click and edit these numbers directly.
5.  **Template Selection:** A gallery of 5 thumbnails for the user to choose their final layout.
6.  **Export:** Render to `.docx` via `docxtpl` and provide a download + "Save to Cloud" (S3) option.

---

## 5. Constraints & Guardrails

- **Privacy:** API keys must **never** be saved to the database or S3.
- **Persistence:** Users can save generated resumes to S3 even on the Free BYOK tier.
- **Formatting:** Never attempt to "fix" the user's uploaded file; always render fresh data into a master template.
- **Metric Strategy:** AI is encouraged to "over-deliver" on metrics to provide a high-performance starting point for the user to edit back to reality.

---
