FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONPATH=/app

EXPOSE 5000 8765

# Default: Flask webhook server
# Override with: CMD ["python", "agent/main.py"] for WebSocket server
CMD ["python", "agent/twilio_handler.py"]
