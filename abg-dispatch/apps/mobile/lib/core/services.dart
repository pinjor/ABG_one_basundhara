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

/// The services this person may use, most-used first. The first eight show on
/// the home screen; the rest sit behind "See more".
List<AbgService> servicesFor(Profile? p, L l) {
  bool can(String cap) => p?.can(cap) ?? false;
  return [
    if (can('parcel.create'))
      AbgService(
        id: 'send',
        label: l.svcSendParcel,
        icon: Icons.send_rounded,
        accent: AbgColors.active,
        route: '/create',
        keywords: const ['parcel', 'document', 'book', 'courier', 'পার্সেল'],
      ),
    if (can('parcel.view.own'))
      AbgService(
        id: 'parcels',
        label: l.svcMyParcels,
        icon: Icons.inventory_2_rounded,
        accent: AbgColors.navy500,
        route: '/parcels',
        keywords: const ['track', 'receive', 'tracking', 'ট্র্যাক'],
      ),
    if (can('fleet.request'))
      AbgService(
        id: 'pool-car',
        label: l.svcPoolCar,
        icon: Icons.directions_car_filled_rounded,
        accent: _teal,
        route: '/pool-car',
        keywords: const ['car', 'vehicle', 'transport', 'driver', 'গাড়ি'],
      ),
    if (can('incident.report'))
      AbgService(
        id: 'report',
        label: l.svcReportIssue,
        icon: Icons.campaign_rounded,
        accent: AbgColors.danger,
        route: '/incidents/new',
        keywords: const ['incident', 'safety', 'facility', 'complaint', 'ঘটনা'],
      ),
    if (can('visitor.invite'))
      AbgService(
        id: 'visitors',
        label: can('visitor.manage') ? l.svcGateDesk : l.svcVisitors,
        icon: Icons.badge_rounded,
        accent: AbgColors.pending,
        route: '/visitors',
        keywords: const ['guest', 'gate pass', 'visitor', 'অতিথি'],
      ),
    if (can('tour.request'))
      AbgService(
        id: 'tours',
        label: l.svcTours,
        icon: Icons.flight_takeoff_rounded,
        accent: _indigo,
        route: '/tours',
        keywords: const ['travel', 'tour', 'trip', 'foreign', 'ভ্রমণ'],
      ),
    if (can('notice.read'))
      AbgService(
        id: 'notices',
        label: l.svcNotices,
        icon: Icons.newspaper_rounded,
        accent: AbgColors.success,
        route: '/notices',
        keywords: const ['notice', 'circular', 'announcement', 'নোটিশ'],
      ),
    AbgService(
      id: 'approvals',
      label: l.svcApprovals,
      icon: Icons.fact_check_rounded,
      accent: _rose,
      route: '/approvals',
      keywords: const ['approve', 'hod', 'sanction', 'অনুমোদন'],
    ),
    AbgService(
      id: 'scan',
      label: l.svcScan,
      icon: Icons.qr_code_scanner_rounded,
      accent: AbgColors.navy,
      route: '/scan',
      keywords: const ['qr', 'scan', 'label', 'gate pass', 'স্ক্যান'],
    ),
    if (can('incident.report'))
      AbgService(
        id: 'my-reports',
        label: l.svcMyReports,
        icon: Icons.assignment_rounded,
        accent: AbgColors.pending,
        route: '/incidents',
        keywords: const ['report', 'incident', 'রিপোর্ট'],
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
    if (can('licence.view'))
      AbgService(
        id: 'licences',
        label: l.svcLicences,
        icon: Icons.verified_rounded,
        accent: _indigo,
        route: '/licences',
        keywords: const ['licence', 'license', 'permit', 'renewal', 'লাইসেন্স'],
      ),
  ];
}
