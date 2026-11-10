# Template: bootstrap a new project with the `openstack` CLI

Run as cloud admin (`OS_CLOUD=mycloud-admin`), then switch to the project entry
for the tenant part. Every command and option is in the python-openstackclient
2026.2 reference (https://docs.openstack.org/python-openstackclient/2026.2/cli/commands.html).
Replace the `<...>` values; nothing here deletes anything.

## 0. Read-only discovery (keep the output as the "before" state)

```bash
#!/usr/bin/env bash
set -euo pipefail
export OS_CLOUD=mycloud-admin
openstack token issue -f value -c expires
openstack service list
openstack compute service list
openstack network agent list
openstack volume service list
openstack network list --external                 # name of the external network, e.g. "public"
openstack flavor list
openstack image list
openstack project list
```

Stop and report if a service is `down`, an agent is not alive, or the external
network does not exist.

## 1. Identity and quotas (admin)

```bash
PROJECT=<team-a>
USER=<alice>
openstack project create --domain default --description "<owner / cost centre>" "$PROJECT"
openstack user create --domain default --password-prompt "$USER"
openstack role add --project "$PROJECT" --user "$USER" member
openstack quota set --instances 20 --cores 40 --ram 81920 \
  --volumes 20 --gigabytes 1000 --floating-ips 5 \
  --networks 5 --routers 2 --ports 100 --secgroups 20 "$PROJECT"
openstack quota show --usage "$PROJECT"
```

Optional project-private flavor:

```bash
openstack flavor create --vcpus 4 --ram 8192 --disk 0 --private --project "$PROJECT" "$PROJECT.medium"
```

## 2. Tenant network (as the project user: `OS_CLOUD=<team-a>`)

```bash
export OS_CLOUD=<team-a>
openstack network create app-net
openstack subnet create --network app-net --subnet-range 10.20.0.0/24 \
  --dns-nameserver <resolver-ip> app-subnet
openstack router create app-router
openstack router set --external-gateway public app-router
openstack router add subnet app-router app-subnet
openstack security group create app-sg
openstack security group rule create --ingress --protocol tcp --dst-port 22 \
  --remote-ip <admin-cidr> app-sg
openstack security group rule create --ingress --protocol icmp --remote-ip <admin-cidr> app-sg
openstack keypair create --public-key ~/.ssh/id_ed25519.pub "$USER-key"
```

## 3. First server (canary)

```bash
openstack server create --flavor <flavor> --image <image> \
  --boot-from-volume 20 --network app-net --security-group app-sg \
  --key-name "$USER-key" --wait canary01
FIP=$(openstack floating ip create public -f value -c floating_ip_address)
openstack server add floating ip canary01 "$FIP"
```

## 4. Verify

```bash
openstack server show canary01 -c status -c addresses -c fault    # ACTIVE, no fault
openstack server event list canary01
openstack console log show --lines 30 canary01                    # cloud-init finished
ssh -o ConnectTimeout=10 <image-user>@"$FIP" true && echo "reachable"
openstack quota show --usage "$PROJECT"                           # admin cloud
```

## 5. Cleanup of the canary (propose, then the user's go)

Effect: deletes the instance; its 20 GB root volume survives (`--boot-from-volume`
without `--delete-on-termination`), the floating IP stays allocated to the project.

```bash
openstack server delete --wait canary01
openstack volume list --status available          # identify the orphaned root volume, then propose its deletion
openstack floating ip delete "$FIP"
```
