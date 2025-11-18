# Use a slim Python base image
FROM python:3.11-slim

# Create app directory
WORKDIR /app

# Install system dependencies (if any needed later, add here)
RUN apt-get update && apt-get install -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency list and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py presentations.csv ./

# Streamlit listens on 8501 by default; Cloud Run provides PORT
ENV PORT=8080
EXPOSE 8080

# Run streamlit, binding to the provided PORT
CMD ["sh", "-c", "streamlit run app.py --server.port=${PORT:-8080} --server.address=0.0.0.0"]
