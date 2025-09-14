# A simple speech-to-speech web app using FastAPI and Next.js

## Abstract

1. Speech-to-speech using WebRTC.
2. To implement it, use OpenAI realtime API.
3. Backend is FastAPI.
4. Frontend is Next.js.
5. CSS framework is Tailwind.

## How to use

### Prerequisites

- docker

### STEP 1 Clone the repo

```bash
git clone https://github.com/YoheiWatanabe/speech-to-speech-openai-using-fastapi-and-nextjs.git
```

### STEP 2 Set `.env` file

```bash
cd backend
vi .env
```

- `backend/.env`

```bash
OPENAI_API_KEY="sk-YOUR-OPENAI-KEY"
```

```bash
.
├── .dockerignore
├── .git
├── .gitignore
├── LICENSE
├── backend
│   ├── .dockerignore
│   ├── .env
│   ├── .gitignore
│   ├── Dockerfile
│   ├── main.py
│   └── requirements.txt
├── docker-compose.yml
├── frontend
│   ├── .dockerignore
│   ├── .gitignore
│   ├── Dockerfile
│   ├── eslint.config.mjs
│   ├── next-env.d.ts
│   ├── next.config.ts
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.mjs
│   ├── public
│   ├── src
│   └── tsconfig.json
└── readme.md
```

### STEP 3 Bulid docker

```bash
docker-compose up --build -d
```

### STEP 4 Access localhost

#### 4.1 backend

```bash
http://localhost:5001/docs
```

#### 4.2 frontend

```bash
http://localhost:3000/
```

### STEP 5 Test

1. Press the mic button.(`Conversation started via WebRTC`)
2. Speak
3. Press the mic button again if you stop talking.

## Troubleshootings

### 1. `Cannot find module 'react' or its corresponding type declarations.ts(2307)`

- If you modify code on an IDE(e.g., VSCode), an error will occur. Then you must command `nmp install`.

```bash
cd frontend
npm install
```
