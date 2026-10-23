import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../models/models.dart';
import '../theme/tokens.dart';

/// One tile in the home screen's services grid.
class AbgService {
  const AbgService({
    required this.id,
    required this.label,
    required this.icon,
    required this.accent,
    required this.route,
    this.keywords = const [],
  });

  final String id;
  final String label;
  final IconData icon;

  /// Icon colour; the circle behind it is a soft tint of the same colour.
  final Color accent;
  final String route;

  /// Extra words the service search matches (English and Bangla).
  final List<String> keywords;

  bool matches(String query) {
    final q = query.trim().toLowerCase();
    if (q.isEmpty) return true;
    return label.toLowerCase().contains(q) ||
        keywords.any((k) => k.toLowerCase().contains(q));
  }
}

const _teal = Color(0xFF0E8A8A);
const _indigo = Color(0xFF4B4FC4);
const _rose = Color(0xFFC0466A);
const _plum = Color(0xFF8E4EC6);
const _ocean = Color(0xFF1F6F9F);
const _steel = Color(0xFF2B6CB0);

/// The services this person may use, in the order the group agreed for the
/// menu (the admin portal's sidebar follows the same order):
/// 1 Notice board · 2 Request for Appointment · 3 Incident record ·
/// 4 Regulatory Affairs · 5 Audit · 6 Office parcel · 7 Visitor Management ·
/// 8 Leave apply · 9 Pool car request — then tours, approvals, scanning and
/// a driver's trips. The first eight show on the home screen; the rest sit
/// behind "See more".
List<AbgService> servicesFor(Profile? p, L l) {
  bool can(String cap) => p?.can(cap) ?? false;
  return [
    if (can('notice.read'))
      AbgService(
        id: 'notices',
        label: l.svcNotices,
        icon: Icons.newspaper_rounded,
        accent: AbgColors.success,
        route: '/notices',
        keywords: const ['notice', 'circular', 'announcement', 'নোটিশ'],
      ),
    if (can('appointment.request'))
      AbgService(
        id: 'appointments',
        label: l.svcAppointment,
        icon: Icons.event_rounded,
        accent: _plum,
        route: '/appointments',
        keywords: const [
          'appointment',
          'meeting',
          'md',
          'chairman',
          'schedule',
          'সাক্ষাৎ',
        ],
      ),
    if (can('incident.report'))
      AbgService(
        id: 'incidents',
        label: l.svcIncidentRecord,
        icon: Icons.campaign_rounded,
        accent: AbgColors.danger,
        route: '/incidents',
        keywords: const [
          'incident',
          'report',
          'safety',
          'facility',
          'complaint',
          'ঘটনা',
        ],
      ),
    if (can('licence.view'))
      AbgService(
        id: 'licences',
        label: l.svcRegulatory,
        icon: Icons.verified_rounded,
        accent: _indigo,
        route: '/licences',
        keywords: const [
          'licence',
          'license',
          'permit',
          'renewal',
          'regulatory',
          'লাইসেন্স',
        ],
      ),
    if (p?.employee != null)
      AbgService(
        id: 'audits',
        label: l.svcAudit,
        icon: Icons.fact_check_rounded,
        accent: _ocean,
        route: '/audits',
        keywords: const [
          'audit',
          'finding',
          'corrective',
          'compliance',
          'অডিট',
        ],
      ),
    if (can('parcel.view.own') || can('parcel.create'))
      AbgService(
        id: 'parcels',
        label: l.svcOfficeParcel,
        icon: Icons.inventory_2_rounded,
        accent: AbgColors.navy500,
        route: '/parcels',
        keywords: const [
          'parcel',
          'document',
          'send',
          'courier',
          'track',
          'পার্সেল',
        ],
      ),
    if (can('visitor.invite'))
      AbgService(
        id: 'visitors',
        label: l.svcVisitorManagement,
        icon: Icons.badge_rounded,
        accent: AbgColors.pending,
        route: '/visitors',
        keywords: const ['guest', 'gate pass', 'visitor', 'gate', 'অতিথি'],
      ),
    if (can('leave.apply'))
      AbgService(
        id: 'leave',
        label: l.svcLeave,
        icon: Icons.beach_access_rounded,
        accent: _rose,
        route: '/leave',
        keywords: const [
          'leave',
          'holiday',
          'casual',
          'sick',
          'vacation',
          'ছুটি',
        ],
      ),
    if (can('fleet.request'))
      AbgService(
        id: 'pool-car',
        label: l.svcPoolCarRequest,
        icon: Icons.directions_car_filled_rounded,
        accent: _teal,
        route: '/pool-car',
        keywords: const ['car', 'vehicle', 'transport', 'driver', 'গাড়ি'],
      ),
    if (can('tour.request'))
      AbgService(
        id: 'tours',
        label: l.svcTours,
        icon: Icons.flight_takeoff_rounded,
        accent: _steel,
        route: '/tours',
        keywords: const ['travel', 'tour', 'trip', 'foreign', 'ভ্রমণ'],
      ),
    AbgService(
      id: 'approvals',
      label: l.svcApprovals,
      icon: Icons.fact_check_outlined,
      accent: AbgColors.active,
      route: '/approvals',
      keywords: const ['approve', 'hod', 'sanction', 'leave', 'অনুমোদন'],
    ),
    AbgService(
      id: 'scan',
      label: l.svcScan,
      icon: Icons.qr_code_scanner_rounded,
      accent: AbgColors.navy,
      route: '/scan',
      keywords: const ['qr', 'scan', 'label', 'gate pass', 'স্ক্যান'],
    ),
    if (can('fleet.drive'))
      AbgService(
        id: 'my-trips',
        label: l.svcMyTrips,
        icon: Icons.route_rounded,
        accent: _teal,
        route: '/pool-car',
        keywords: const ['trip', 'driver', 'ট্রিপ'],
      ),
  ];
}
