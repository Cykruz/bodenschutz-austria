# Alternative: nginx statt Caddy

Standard ist Caddy (`docker-compose.yml`), weil es Zertifikate von Let's Encrypt selbst holt und erneuert. Wer auf dem Server bereits nginx betreibt, kann die Container ohne Caddy starten und nginx davorsetzen.

1. In `docker-compose.yml` den Dienst `caddy` entfernen oder mit `docker compose up -d api web` nur API und Website starten, und bei `api` und `web` die Ports lokal veröffentlichen (`127.0.0.1:4000:4000` bzw. `127.0.0.1:3000:3000`).
2. `bodenschutz.conf` nach `/etc/nginx/sites-available/` kopieren, Domain eintragen, verlinken: `ln -s /etc/nginx/sites-available/bodenschutz.conf /etc/nginx/sites-enabled/`.
3. Zertifikat mit Certbot holen: `apt install certbot python3-certbot-nginx && certbot --nginx -d bodenschutz-austria.at -d www.bodenschutz-austria.at`.
4. `nginx -t && systemctl reload nginx`.

Die Security-Header und die optionale IP-Sperre für `/admin` stehen in `bodenschutz.conf` als Kommentar bzw. Beispiel.
