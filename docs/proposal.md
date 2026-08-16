# Project Proposal

**Project Title:** Developer Detective

**Team Members**

| ID        | Name                      |
| --------- | ------------------------- |
| 662115004 | Jirapat Sereerat          |
| 662115022 | Thanatchanan Kanjina      |
| 662115034 | Peeranat Thiwongsa        |
| 662115049 | Supawit Promma            |
| 662115056 | Aphichaya Suppakitkumjorn |

**Course:** Ethics and Professionalism for Software Engineers (953420)

**Instructors:** Asst. Prof. Dr. Pradorn Sureephong, Asst. Prof. Dr. Suepphong Chernbumroong

## Project Overview

### Background

Software now underpins healthcare, finance, and public services, yet a persistent gap separates what computer-science graduates are taught from what professional software engineering actually demands. Insecure code carries real, measurable costs, such as multi-million dollar data breaches or AI agents caught in infinite loops running up massive API charges.

### Problem Statement

Traditional coding exercises are disconnected from business outcomes. Junior developers lack practical experience in auditing code for vulnerabilities, understanding the business impact of insecure code, and navigating ethical grey areas under management pressure.

### Project Objective

To design and develop a web-based, narrative-driven learning platform that simulates real-world software engineering incidents, helping learners develop secure code review and ethical decision-making skills.

## Proposed Solution

### System Description

The system is a browser-based detective workspace that behaves like a simplified IDE, opening with an incident scenario presented as an email or ticket to immerse the user in a professional assignment.

### Main Features

- **Incident Brief Panel & Repository Explorer:** Narrative entry point paired with a navigable file tree of a simulated multi-file codebase.
- **Code Viewer:** A read-only code inspection surface built on the Monaco editor, with syntax highlighting and file-to-file navigation.
- **Incident Investigation Quiz & Adaptive Hint System:** Automated assessments checking answers against predefined solutions, supported by a multi-tier score-penalized hint system.
- **Debrief & Ethical Decision Point:** Post-solve root-cause explanations and interactive ethical choices with simulated consequences.
- **Accounts & Progress Tracking:** Email-and-password registration through Supabase Auth, required before any case can be opened, so scores, solved cases, and hint usage follow a learner between devices and each case reads as work assigned to that person.

### Expected Output

A functional web prototype featuring at least one complete, end-to-end scenario demonstrating secure code review, business impact, and ethical decision-making.

## Target Users

**Who will use the system?** Undergraduate software-engineering students and early-career junior developers.

**What problems will it solve for them?** It solves the lack of practical, hands-on exposure to live security incidents, messy codebases, and the professional responsibility required to fix them properly without simply acting as an attacker.

## Ethical Considerations

- **Privacy:** Collecting the minimum that the feature requires. Accounts store an email address and nothing else; progress records hold quiz scores and hint counts, never personal data. The scenarios themselves teach the real-world implications of insecure data handling.
- **Security:** Acknowledging the developer's ethical responsibility in system safety and recognizing that a single overlooked defect compromises physical and digital safety. The platform is held to the standard it teaches: authentication is delegated to Supabase Auth rather than hand-rolled, access tokens are verified on every request, and no credential is ever stored or handled by our own code.
- **Fairness:** Ensuring objective evaluation of learners through a standardized automated validation engine that evaluates quiz answers against predefined solutions without bias.
- **Professional Integrity:** Training developers to navigate management pressure and choose to implement secure, proper fixes rather than knowingly shipping vulnerable code.

## Development Plan

### Development Tools

- **Language:** TypeScript across the whole stack, organised as an npm workspace monorepo (`shared`, `backend`, `frontend`).
- **Frontend:** Vue.js 3 with Vue Router, Pinia, Vite, Tailwind CSS, and the Monaco editor for the read-only code viewer.
- **Backend:** Node.js 22 with Express, request/response validation via Zod.
- **Authentication:** Supabase Auth for registration and sign-in, with access tokens verified locally in the API using `jose`.
- **Database:** PostgreSQL (hosted on Supabase) accessed through the Drizzle ORM, with SQL migrations and a seed pipeline for scenario content.
- **Testing:** Vitest for unit and integration tests, Supertest for HTTP-level API tests, and Playwright for end-to-end browser tests.
- **Deployment:** Vercel for the primary hosted deployment (static frontend plus a serverless API entry point), with Docker and Docker Compose providing an equivalent self-hosted path (Express container behind an nginx container).

### Team Responsibilities

| Member                    | Responsibility                              |
| ------------------------- | ------------------------------------------- |
| Jirapat Sereerat          | Use Case Authoring & Systems Design         |
| Thanatchanan Kanjina      | Frontend Development                        |
| Peeranat Thiwongsa        | Backend API & Database & Use Case Authoring |
| Supawit Promma            | QA Testing & Deployment (Docker / Vercel)   |
| Aphichaya Suppakitkumjorn | Frontend Development                        |

### Timeline

| Week   | Activity                               |
| ------ | -------------------------------------- |
| Week 1 | Project Proposal & Architectural Setup |
| Week 2 | Prototype V1                           |
| Week 3 | Prototype V2                           |
| Week 4 | User Testing & Content Integration     |
| Week 5 | Improvement, Bug Fixes & Final Polish  |

### Expected Challenges

- **Technical challenges:** Building a reliable validation engine that accurately evaluates the learner's answers against predefined solutions, and embedding a read-only IDE workspace in the browser.
- **Time management:** Delivering a polished MVP from a single monorepo — deployable both as a serverless Vercel build and as a Docker Compose stack — within the hard constraints of a single academic term.
- **User testing:** Ensuring the progressive hint system provides just enough guidance without giving away the answer, maintaining a self-paced flow without manual instructor intervention.
- **Enforcing the gate in the right place:** The sign-in requirement has to hold at the API, not only in the browser. A route guard is a convenience; a client that simply omits a header must still be refused.
