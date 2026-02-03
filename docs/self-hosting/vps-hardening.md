# VPS Hardening Guide

Security hardening checklist for your Doctify server.

## Overview

This guide covers essential security measures for protecting your Doctify deployment. Complete these steps before deploying the application.

## Security Checklist

```
[ ] SSH key-only authentication
[ ] SSH port changed (optional)
[ ] UFW firewall configured
[ ] Fail2ban installed
[ ] Automatic security updates enabled
[ ] Non-root deployment user created
[ ] Log rotation configured
[ ] System auditing enabled
```

## Step 1: Create Non-Root User

Never run applications as root. Create a dedicated deployment user:

```bash
# Create user with home directory
sudo adduser doctify

# Add to sudo group (for administrative tasks)
sudo usermod -aG sudo doctify

# Add to docker group (for running containers)
sudo usermod -aG docker doctify
```

## Step 2: Configure SSH Security

### Generate SSH Key (on your local machine)

```bash
# Generate ED25519 key (recommended)
ssh-keygen -t ed25519 -C "your-email@example.com" -f ~/.ssh/doctify_key

# Or RSA 4096-bit if ED25519 not supported
ssh-keygen -t rsa -b 4096 -C "your-email@example.com" -f ~/.ssh/doctify_key
```

### Copy Key to Server

```bash
# Copy public key to server
ssh-copy-id -i ~/.ssh/doctify_key.pub doctify@your-server-ip

# Test login with key
ssh -i ~/.ssh/doctify_key doctify@your-server-ip
```

### Harden SSH Configuration

Edit `/etc/ssh/sshd_config`:

```bash
sudo nano /etc/ssh/sshd_config
```

Apply these settings:

```bash
# Disable root login
PermitRootLogin no

# Disable password authentication
PasswordAuthentication no

# Enable public key authentication
PubkeyAuthentication yes

# Disable empty passwords
PermitEmptyPasswords no

# Limit authentication attempts
MaxAuthTries 3

# Set login grace time
LoginGraceTime 60

# Disable X11 forwarding
X11Forwarding no

# Optional: Change SSH port (uncomment and set your port)
# Port 2222

# Limit to specific users
AllowUsers doctify
```

Restart SSH:

```bash
# Validate configuration
sudo sshd -t

# Restart SSH
sudo systemctl restart sshd

# IMPORTANT: Keep current session open and test in new terminal
ssh -i ~/.ssh/doctify_key doctify@your-server-ip
```

## Step 3: Configure Firewall (UFW)

```bash
# Install UFW if not present
sudo apt install -y ufw

# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (use your custom port if changed)
sudo ufw allow ssh
# Or: sudo ufw allow 2222/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

Expected output:

```
Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), disabled (routed)

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere
80/tcp                     ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
```

## Step 4: Install Fail2ban

Fail2ban protects against brute-force attacks:

```bash
# Install fail2ban
sudo apt install -y fail2ban

# Create local configuration
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local
```

Configure jail settings:

```ini
[DEFAULT]
# Ban duration (10 minutes)
bantime = 10m

# Time window for failures
findtime = 10m

# Max failures before ban
maxretry = 5

# Email notifications (optional)
# destemail = your-email@example.com
# sender = fail2ban@your-domain.com
# action = %(action_mwl)s

[sshd]
enabled = true
port = ssh
# Or: port = 2222
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 1h
```

Start fail2ban:

```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Check status
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

## Step 5: Enable Automatic Security Updates

```bash
# Install unattended-upgrades
sudo apt install -y unattended-upgrades apt-listchanges

# Enable automatic updates
sudo dpkg-reconfigure -plow unattended-upgrades

# Configure settings
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

Ensure these lines are uncommented:

```
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};

// Automatically reboot if required (off by default)
// Unattended-Upgrade::Automatic-Reboot "true";
// Unattended-Upgrade::Automatic-Reboot-Time "02:00";

// Email notifications
// Unattended-Upgrade::Mail "your-email@example.com";
```

Test automatic updates:

```bash
sudo unattended-upgrades --dry-run --debug
```

## Step 6: Configure Log Rotation

Ensure logs don't fill up disk space:

```bash
# Docker log rotation
sudo nano /etc/docker/daemon.json
```

Add:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Restart Docker:

```bash
sudo systemctl restart docker
```

## Step 7: System Auditing (Optional)

Install auditd for security monitoring:

```bash
# Install auditd
sudo apt install -y auditd audispd-plugins

# Enable and start
sudo systemctl enable auditd
sudo systemctl start auditd

# Add audit rules for sensitive files
sudo nano /etc/audit/rules.d/audit.rules
```

Add rules:

```
# Monitor SSH configuration changes
-w /etc/ssh/sshd_config -p wa -k sshd_config

# Monitor password/group file changes
-w /etc/passwd -p wa -k passwd_changes
-w /etc/shadow -p wa -k shadow_changes
-w /etc/group -p wa -k group_changes

# Monitor sudo usage
-w /etc/sudoers -p wa -k sudoers_changes
-w /etc/sudoers.d/ -p wa -k sudoers_changes

# Monitor Docker
-w /var/lib/docker -p wa -k docker
-w /etc/docker -p wa -k docker_config
```

Load rules:

```bash
sudo augenrules --load
sudo systemctl restart auditd
```

## Step 8: Additional Hardening

### Disable Unused Services

```bash
# List enabled services
systemctl list-unit-files --state=enabled

# Disable unused services (examples)
sudo systemctl disable cups
sudo systemctl disable avahi-daemon
```

### Secure Shared Memory

```bash
# Add to /etc/fstab
echo "tmpfs /run/shm tmpfs defaults,noexec,nosuid 0 0" | sudo tee -a /etc/fstab
```

### Set Secure File Permissions

```bash
# Restrict cron access
sudo chmod 700 /etc/cron.d
sudo chmod 700 /etc/cron.daily
sudo chmod 700 /etc/cron.hourly
sudo chmod 700 /etc/cron.weekly
sudo chmod 700 /etc/cron.monthly

# Secure SSH directory
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### Configure System Limits

```bash
# Edit /etc/security/limits.conf
sudo nano /etc/security/limits.conf
```

Add:

```
# Increase file limits for Docker
* soft nofile 65535
* hard nofile 65535
```

## Verification Checklist

Run these commands to verify hardening:

```bash
# 1. Verify SSH configuration
sudo sshd -T | grep -E 'permitrootlogin|passwordauthentication'
# Expected: permitrootlogin no, passwordauthentication no

# 2. Check firewall status
sudo ufw status
# Expected: Status: active with only required ports

# 3. Check fail2ban status
sudo fail2ban-client status sshd
# Expected: Currently banned: 0 (or more if attacks detected)

# 4. Verify automatic updates
apt-config dump | grep -i unattended
# Expected: APT::Periodic::Unattended-Upgrade "1"

# 5. Check listening ports
sudo ss -tulpn
# Expected: Only SSH (22), HTTP (80), HTTPS (443)

# 6. Check running services
systemctl list-units --type=service --state=running
# Review for unnecessary services
```

## Security Monitoring

### Regular Tasks

| Task | Frequency | Command |
|------|-----------|---------|
| Check fail2ban logs | Daily | `sudo fail2ban-client status sshd` |
| Review auth logs | Daily | `sudo tail -100 /var/log/auth.log` |
| Check for updates | Weekly | `sudo apt update && apt list --upgradable` |
| Review audit logs | Weekly | `sudo ausearch -ts today` |
| Full security audit | Monthly | Run security scanner |

### Security Scanners

```bash
# Install Lynis security auditor
sudo apt install -y lynis

# Run security audit
sudo lynis audit system

# Review report
cat /var/log/lynis-report.dat
```

## Emergency Procedures

### If Server is Compromised

1. **Isolate**: Disconnect from network if possible
2. **Preserve Evidence**: Take snapshots before changes
3. **Investigate**: Review logs for breach timeline
4. **Remediate**: Patch vulnerabilities, rotate all credentials
5. **Restore**: Rebuild from clean backup if necessary
6. **Report**: Document incident and notify affected parties

### Emergency Access Recovery

If locked out:

1. Use VPS provider's console access
2. Boot into recovery mode
3. Fix SSH configuration
4. Reset to known-good state

## Next Steps

After hardening:
1. [Install Doctify](installation.md)
2. [Configure SSL](ssl-setup.md)
3. [Set up backups](backup-recovery.md)
