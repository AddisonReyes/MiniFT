web: bash -lc "python minift/manage.py migrate --noinput && python minift/manage.py collectstatic --noinput && gunicorn config.wsgi:application --chdir minift --bind 0.0.0.0:$PORT"
