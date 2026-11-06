# Ubuntu 16 Desktop VM

A browser-based live desktop emulator for the **Ubuntu 16.04.5 32-bit desktop**
image. Upload the static site files to S3 and open the site; the page
automatically boots Ubuntu without an ISO picker or installation step.

## Deploy to S3

1. Upload this page as `index.html` to your static website bucket.
2. Upload the Ubuntu ISO as `ubuntu.iso` to the `calcunitone` bucket in
   `us-east-1`. The page is configured to read it from
   `https://calcunitone.s3.us-east-1.amazonaws.com/ubuntu.iso`.
3. Configure the bucket's CORS settings to allow your website origin to make
   range requests to the ISO (example below), then open the website.

For example, with the AWS CLI and a configured profile:

```bash
aws s3 cp index.html s3://YOUR_BUCKET/index.html --content-type text/html
aws s3 cp ubuntu-16.04.5-desktop-i386.iso s3://calcunitone/ubuntu.iso \
  --content-type application/x-iso9660-image
```

For the S3 bucket's **Permissions → Cross-origin resource sharing (CORS)**
configuration, replace the example origin with the exact origin serving
`index.html` (scheme, hostname, and port; no path):

```json
[
  {
    "AllowedOrigins": ["https://YOUR-WEBSITE-ORIGIN"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range"],
    "ExposeHeaders": ["Accept-Ranges", "Content-Range", "Content-Length"],
    "MaxAgeSeconds": 3000
  }
]
```

The browser only requests the ISO sectors needed while Ubuntu boots and runs;
it does not download the full image into memory first. The object supports
byte-range GET requests, but because it is served from a different S3 origin,
the bucket must permit browser CORS requests from the page's origin.

### Bucket access

An S3 static website endpoint is public and HTTP-only. If using it directly,
allow public `s3:GetObject` only for `index.html` and `ubuntu.iso`; do not put
secrets or unrelated files in that bucket. For HTTPS or a private bucket, put
CloudFront in front of the S3 REST origin with Origin Access Control, and make
sure both files are served from the same CloudFront hostname. Avoid enabling
public website access when using the private CloudFront setup.

## Runtime

The page also loads the v86 emulator and BIOS assets from `copy.sh`, so browser
clients need access to that CDN. Machine Settings lets users select 256 MB,
512 MB, 1 GB, or 2 GB of RAM; hardware changes take effect after restarting the
VM. A saved VM state can be stored in IndexedDB and restored with the same VM
settings. Browser preferences use local storage.

This v86 build emulates one CPU core; multiple-core options are unavailable.
Networking is off by default and requires a WebSocket relay URL configured in
`V86_NETWORK_RELAY_URL` in `index.html`. The Ubuntu live session has no
persistent virtual hard disk; changes are lost when the VM is reset or the page
is closed unless a VM state is explicitly saved.

## Important: end-of-life software

Ubuntu 16.04 is end-of-life and no longer receives standard security updates.
Use this legacy image for offline experimentation only. Do not use it for
sensitive data, sign into accounts, or expose it to untrusted networks.
Emulation speed depends on the device and browser; a desktop session may be
slow or fail on memory-constrained devices.
