/// Retorna timezone IANA aproximado para header X-Timezone.
String deviceTimezone() {
  final name = DateTime.now().timeZoneName;
  if (name.isNotEmpty && !name.startsWith('+') && !name.startsWith('-')) {
    return name;
  }
  final offset = DateTime.now().timeZoneOffset;
  if (offset.inHours == -3) return 'America/Sao_Paulo';
  if (offset.inHours == 0) return 'UTC';
  return 'UTC';
}
