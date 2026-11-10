# Sealed Secrets workflow (placeholders only)

Controller namespace `kube-system` is the default; adjust `--controller-namespace` /
`--controller-name` when the controller runs elsewhere (flag names: `kubeseal --help`).
Never put a secret value in a command argument or in the chat.

## 1. Get the public certificate once (not secret)

```bash
kubeseal --fetch-cert > sealed-secrets-cert.pem      # needs API access to the controller
```

Publish the certificate where the team can reach it; refresh it periodically (sealing keys renew every 30 days).

## 2. Seal a Secret offline

```bash
umask 077
# secret.txt holds the value, created by the store or an editor, mode 0600, never committed
kubectl create secret generic app-db \
  --namespace CHANGE_ME_NAMESPACE \
  --from-file=password=./secret.txt \
  --dry-run=client -o yaml \
  | kubeseal --cert sealed-secrets-cert.pem --scope strict -o yaml \
  > k8s/app-db.sealedsecret.yaml
shred -u secret.txt 2>/dev/null || rm -P secret.txt     # remove the plaintext source (platform dependent)
git add k8s/app-db.sealedsecret.yaml
```

The `-o yaml` of `--dry-run=client` goes only into the pipe, never to the terminal.

Expected shape of the committed file (ciphertext is a placeholder here):

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: app-db
  namespace: CHANGE_ME_NAMESPACE
spec:
  encryptedData:
    password: <CIPHERTEXT_PLACEHOLDER>
  template:
    metadata:
      name: app-db
      namespace: CHANGE_ME_NAMESPACE
```

## 3. Re-encrypt to the newest key (after a key renewal)

```bash
kubeseal --re-encrypt < k8s/app-db.sealedsecret.yaml > tmp.json && mv tmp.json k8s/app-db.sealedsecret.yaml
```

Does not update the in-cluster object; commit the file and let the GitOps tool apply it.

## 4. Back up the controller keys (after EVERY renewal; destructive-secret-ops.md for restore)

```bash
umask 077
kubectl get secret -n kube-system -l sealedsecrets.bitnami.com/sealed-secrets-key -o yaml > sealed-keys.yaml
age -r <AGE_PUBLIC_KEY_OFFLINE_RECOVERY> -o sealed-keys.yaml.age sealed-keys.yaml
shred -u sealed-keys.yaml 2>/dev/null || rm -P sealed-keys.yaml
# store sealed-keys.yaml.age OFFLINE, outside the cluster and outside this Git repo
```

The backup holds private keys. The encryption step uses a recipient (public key) only.
`age -r` and `-o` are standard age options; confirm with `age --help` on your version.

Not verified: the README examples show `kubeseal --scope ... <in >out` with JSON output and `--cert`, `--fetch-cert`, `--re-encrypt`; the `-o yaml`, `--controller-namespace` and `--controller-name` flags and `shred`/`rm -P` availability were not read. Check `kubeseal --help` first.

## 5. Restore after a disaster (propose first: ACTION / EFFECT / PROOF / WAIT-FOR-GO)

Apply the key Secrets before the controller starts, or replace the new ones and restart the controller pod. Verify that an existing SealedSecret decrypts (`kubectl get sealedsecret -n CHANGE_ME_NAMESPACE` conditions), never by printing the Secret.
