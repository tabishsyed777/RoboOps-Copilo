# RoboOps Copilot

An agentic RAG prototype for robotics and automation teams. It searches procedures, answers with source citations, reads a simulated robot status tool, and prepares maintenance suggestions for operator review. It never sends commands to physical machinery.

The included robots and procedures are fictional training data. Do not use them to operate or maintain a real robot.

## Live browser demo

The GitHub Pages site runs in browser demo mode without a backend or API key. It can retrieve from the included sample excerpts, show citations, and keep a review queue in the current page session. PDF indexing, server retrieval, Gemini answers, and server-saved activity require the backend below.

## Run with the RAG backend

Requires Python 3.11 or newer.

```sh
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Open <http://localhost:8000>. The retrieval pipeline works without a model key. To enable Gemini-generated answers and tool calling, set a server-side key:

```sh
export GEMINI_API_KEY='your-key'
export GEMINI_MODEL='gemini-3.8-flash'
uvicorn main:app --reload --port 8000
```

Keep the key on the backend; never add it to `config.js` or browser code. The model can call read-only simulated robot status and prepare an allow-listed action proposal. Proposals wait for operator review and are never sent to physical equipment.

## Try it

- Ask **Why did Aster-6 stop?** or **How do I clear a guard fault?** to retrieve source passages.
- Ask **Suggest a preventive check for Aster-6** to create a review-only proposal.
- Use **＋ Add** to index a PDF, Markdown, or text procedure when the backend is running.
- Refresh status to query the read-only simulated robot endpoint.

## API

- `GET /api/health` — backend mode and index status.
- `GET /api/robots` and `POST /api/robots/{robot_id}/refresh` — simulated read-only cell state.
- `GET /api/documents` and `POST /api/documents` — list or upload knowledge sources.
- `POST /api/chat` — retrieve passages, inspect simulated status, optionally call Gemini, and return citations and proposals.
- `POST /api/actions/{action_id}/review` — approve or reject a proposal in the simulator only.

Retrieval uses a compact BM25-style ranker over local text chunks. Gemini is optional and only called from the backend.

## Deploy the backend with Docker

Build from the repository root:

```sh
docker build -f backend/Dockerfile -t roboops .
docker run --rm -p 8000:8000 -e GEMINI_API_KEY="$GEMINI_API_KEY" roboops
```

For separate frontend and backend hosts, set `ALLOWED_ORIGINS` on the backend to the exact frontend origin, then set `apiBase` in `config.js` to the backend HTTPS URL and push. Do not place secrets in `config.js`.

The prototype keeps uploaded files on disk and robot state and proposals in memory. A production system needs authentication, durable storage, access controls, audit logging, approved site procedures, and a separately engineered robot gateway. It should never expose robot control directly to an LLM.
