import 'package:intl/intl.dart';

import '../l10n/app_localizations.dart';

/// All times are shown in Asia/Dhaka (UTC+6, no daylight saving) whatever
/// the phone's own time zone, so every screen agrees with the paper register.
DateTime toDhaka(DateTime t) => t.toUtc().add(const Duration(hours: 6));

String timeOfDay(DateTime t, String locale) =>
    DateFormat.jm(locale).format(toDhaka(t));

String dayAndTime(DateTime t, String locale) {
  final d = toDhaka(t);
  final now = toDhaka(DateTime.now());
  final sameDay =
      d.year == now.year && d.month == now.month && d.day == now.day;
  if (sameDay) return DateFormat.jm(locale).format(d);
  return '${DateFormat.MMMd(locale).format(d)}, ${DateFormat.jm(locale).format(d)}';
}

String fullStamp(DateTime t, String locale) =>
    '${DateFormat.yMMMd(locale).format(toDhaka(t))} · ${DateFormat.jm(locale).format(toDhaka(t))}';

String relative(DateTime t, L l) {
  final diff = DateTime.now().difference(t);
  if (diff.inMinutes < 1) return l.justNow;
  if (diff.inMinutes < 60) return l.minutesAgo(diff.inMinutes);
  if (diff.inHours < 24) return l.hoursAgo(diff.inHours);
  if (diff.inHours < 48) return l.yesterday;
  return DateFormat.MMMd(l.localeName).format(toDhaka(t));
}

String duration(Duration d) {
  if (d.inMinutes < 60) return '${d.inMinutes} min';
  final h = d.inHours;
  final m = d.inMinutes % 60;
  return m == 0 ? '${h}h' : '${h}h ${m}m';
}
