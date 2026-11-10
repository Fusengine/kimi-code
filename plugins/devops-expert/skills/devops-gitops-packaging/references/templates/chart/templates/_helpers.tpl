{{/* Helm template (not parseable as plain YAML). Shared names and labels. */}}
{{- define "web.fullname" -}}
{{- printf "%s" .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "web.labels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | quote }}
{{- end -}}

{{- define "web.selectorLabels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "web.image" -}}
{{- if .Values.imageDigest -}}
{{ .Values.imageRepository }}@{{ .Values.imageDigest }}
{{- else -}}
{{ .Values.imageRepository }}:{{ .Values.imageTag }}
{{- end -}}
{{- end -}}
