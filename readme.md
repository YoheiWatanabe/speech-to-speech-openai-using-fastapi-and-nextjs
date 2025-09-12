# A simple speech-to-speech web app using FastAPI and Next.js

## Abstract

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

- Press the mic button.(`Conversation started via WebRTC`)
