# Demo-Server in Google Cloud (Compute Engine)

Eine kleine virtuelle Maschine in Google Cloud richtet sich mit `startup-script.sh` beim ersten Start selbst ein: Docker, Firewall, Anwendung, HTTPS, optional Vorab-Zugang nur für Mario und den Techniker. Die bestehende WordPress-Seite bleibt unberührt; es kommt nur ein DNS-Eintrag für die Demo-Subdomain dazu.

## Vorbereitung (einmalig, 5 Minuten)

1. **GitHub-Token** (solange das Repository privat ist): GitHub → Settings → Developer settings → Fine-grained tokens → „Generate new token“. Repository access: nur `Cykruz/bodenschutz-austria`; Permissions: *Contents: Read-only*. Ablauf z. B. 90 Tage. Token kopieren.
2. **Projekt** in der Cloud Console wählen (die Compute Engine API aktiviert der Befehlsblock unten selbst).
3. **Cloud Shell** öffnen (Symbol `>_` oben rechts in der Console). Dort ist `gcloud` bereits angemeldet.

## VM anlegen (ein Befehl in der Cloud Shell)

Werte in der ersten Zeile anpassen, dann alles einfügen:

```bash
PROJECT=marine-booth-493310-s5; ZONE=europe-west3-a; DOMAIN=demo.bodenschutz-austria.at; REPO_TOKEN='github_pat_…'; DEMO_USER=mario; DEMO_PASSWORD='hier-ein-gutes-passwort'
gcloud config set project "$PROJECT"
gcloud services enable compute.googleapis.com
gcloud compute addresses create bodenschutz-ip --region=europe-west3 --quiet 2>/dev/null || true
gcloud compute firewall-rules create bodenschutz-web --allow=tcp:80,tcp:443,udp:443 --target-tags=bodenschutz --quiet 2>/dev/null || true
curl -fsSL -H "Authorization: Bearer $REPO_TOKEN" -o /tmp/startup.sh https://raw.githubusercontent.com/Cykruz/bodenschutz-austria/main/deploy/gcp/startup-script.sh
gcloud compute instances create bodenschutz-demo --zone="$ZONE" --machine-type=e2-medium \
  --image-family=ubuntu-2404-lts-amd64 --image-project=ubuntu-os-cloud --boot-disk-size=40GB \
  --address=bodenschutz-ip --tags=bodenschutz \
  --metadata-from-file=startup-script=/tmp/startup.sh \
  --metadata="DOMAIN=$DOMAIN,REPO_BRANCH=main,REPO_TOKEN=$REPO_TOKEN,DEMO_USER=$DEMO_USER,DEMO_PASSWORD=$DEMO_PASSWORD"
gcloud compute addresses describe bodenschutz-ip --region=europe-west3 --format='value(address)'
```

Die letzte Zeile zeigt die **feste IP** der VM. Diese IP bei world4you als A-Record für `demo` eintragen (siehe `docs/BETRIEB.md`, Abschnitt A.5b).

## Fortschritt ansehen

```bash
gcloud compute ssh bodenschutz-demo --zone=europe-west3-a --command='sudo journalctl -u google-startup-scripts -f'
```

Nach etwa 10 Minuten steht am Ende `[gcp-startup] fertig`. Sobald der DNS-Eintrag greift, holt Caddy das Zertifikat; `https://demo.bodenschutz-austria.at` fragt dann nach `DEMO_USER`/`DEMO_PASSWORD` und zeigt die Seite. Verwaltung unter `/admin`; das Admin-Passwort steht auf der VM in `/opt/bodenschutz/.env` (`sudo grep ADMIN_PASSWORD /opt/bodenschutz/.env`).

## Kosten und Aufräumen

- `e2-medium` (2 vCPU, 4 GB) in Frankfurt kostet rund 30 Euro im Monat bei Dauerbetrieb; `e2-small` (2 GB) reicht für reine Demos und kostet etwa die Hälfte. Die VM lässt sich jederzeit stoppen (`gcloud compute instances stop bodenschutz-demo --zone=europe-west3-a`), dann fallen nur Platte und IP an (unter 5 Euro).
- Alles entfernen: `gcloud compute instances delete bodenschutz-demo --zone=europe-west3-a` und `gcloud compute addresses delete bodenschutz-ip --region=europe-west3`.

## Hinweise

- Das Token wird nur zum Klonen benutzt und danach aus der Git-Adresse entfernt; es bleibt als Datei nur für root lesbar auf der VM (für `deploy/update.sh`). Wer das nicht will, macht das Repository öffentlich und lässt `REPO_TOKEN` weg.
- Für ein Update später: `gcloud compute ssh bodenschutz-demo --zone=europe-west3-a --command='cd /opt/bodenschutz && sudo -u bodenschutz ./deploy/update.sh'`.
- Für den Livegang wird nur der DNS-Eintrag der Hauptdomain umgestellt und `DOMAIN` in der `.env` geändert; Details in `docs/BETRIEB.md`.
