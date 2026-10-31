FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (build-essential and pymupdf requirements)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install python packages
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared contracts symlink/directory
COPY contracts /contracts
RUN ln -s /contracts /app/contracts || true

# Copy backend application code
COPY backend/ /app/

# Environment defaults
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app:/contracts
ENV PORT=8000
ENV HOST=0.0.0.0

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
