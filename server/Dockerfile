FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    RESUMESYNC_ENV=production \
    RESUMESYNC_DATA_ROOT=/tmp/resumesync-data

WORKDIR /app

RUN adduser --disabled-password --gecos "" appuser

COPY pyproject.toml ./
COPY app ./app

RUN chown -R appuser:appuser /app

RUN pip install --upgrade pip && pip install .

USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
