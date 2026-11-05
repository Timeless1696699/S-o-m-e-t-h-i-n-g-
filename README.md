# Ubuntu 16 Desktop VM

A browser-based live desktop emulator for the **Ubuntu 16.04.5 32-bit desktop**
image. Upload the static site files to one S3 bucket and open the site; the
page automatically boots Ubuntu without an ISO picker or installation step.

## Deploy to S3

1. Create an S3 bucket for static website hosting and set `index.html` as the
   index document.
2. Upload this page as `index.html`.
3. Download the [Ubuntu 16.04.5 32-bit desktop ISO](https://old-releases.ubuntu.com/releases/xenial/ubuntu-16.04.5-desktop-i386.iso)
   from the official Ubuntu archive and upload that file to the bucket root
   with the exact object key `ubuntu.iso`. It is about 1.55 GiB.
4. Open the bucket's website endpoint. The page starts v86 and reads ISO byte
   ranges from `./ubuntu.iso` in the same bucket.

For example, with the AWS CLI and a configured profile:

```bash
aws s3 cp index.html s3://YOUR_BUCKET/index.html --content-type text/html
aws s3 cp ubuntu-16.04.5-desktop-i386.iso s3://YOUR_BUCKET/ubuntu.iso \
  --content-type application/x-iso9660-image
```

The browser only requests the ISO sectors needed while Ubuntu boots and runs;
it does not download the full image into memory first. S3 supports byte-range
GET requests. Because the page and ISO use the same origin, browser CORS
configuration is not needed for the ISO.

### Bucket access

An S3 static website endpoint is public and HTTP-only. If using it directly,
allow public `s3:GetObject` only for `index.html` and `ubuntu.iso`; do not put
secrets or unrelated files in that bucket. For HTTPS or a private bucket, put
CloudFront in front of the S3 REST origin with Origin Access Control, and make
sure both files are served from the same CloudFront hostname. Avoid enabling
public website access when using the private CloudFront setup.

## Runtime

The page also loads the v86 emulator and BIOS assets from `copy.sh`, so browser
clients need access to that CDN. Guest RAM defaults to 1 GB and can be changed
to 768 MB or 1.5 GB. The Ubuntu live session has no persistent virtual hard
disk; changes are lost when the VM is reset or the page is closed.

## Important: end-of-life software

Ubuntu 16.04 is end-of-life and no longer receives standard security updates.
Use this legacy image for offline experimentation only. Do not use it for
sensitive data, sign into accounts, or expose it to untrusted networks.
Emulation speed depends on the device and browser; a desktop session may be
slow or fail on memory-constrained devices.
