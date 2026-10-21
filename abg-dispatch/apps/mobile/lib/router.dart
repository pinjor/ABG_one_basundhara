import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'core/session.dart';
import 'modules/approvals/approvals.dart';
import 'modules/fleet/fleet.dart';
import 'modules/licences/licences.dart';
import 'modules/notices/notices.dart';
import 'modules/tours/tours.dart';
import 'modules/visitors/visitors.dart';
import 'models/models.dart';
import 'screens/booked_screen.dart';
import 'screens/create_parcel_screen.dart';
import 'screens/guest_home_screen.dart';
import 'screens/guest_login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/incident_detail_screen.dart';
import 'screens/login_screen.dart';
import 'screens/my_reports_screen.dart';
import 'screens/notifications_screen.dart';
import 'screens/parcel_detail_screen.dart';
import 'screens/parcels_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/qr_label_screen.dart';
import 'screens/report_incident_screen.dart';
import 'screens/scan_screen.dart';
import 'screens/splash_screen.dart';
import 'widgets/app_shell.dart';

final rootNavigatorKey = GlobalKey<NavigatorState>();

/// Routes, with sign-in state deciding where you may go:
/// employees get the tabbed app, guest carriers only their assignments.
GoRouter buildRouter(SessionController session) {
  // Where the user was heading before sign-in or session restore got in the way
  // (a deep link, a reloaded web page, a notification).
  String? pending;
  const entry = ['/splash', '/login', '/guest-login'];
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/splash',
    refreshListenable: session,
    redirect: (context, state) {
      final loc = state.matchedLocation;
      if (!entry.contains(loc) && loc != '/home' && loc != '/guest') {
        pending = state.uri.toString();
      }
      switch (session.state) {
        case SessionState.restoring:
          return loc == '/splash' ? null : '/splash';
        case SessionState.signedOut:
          return (loc == '/login' || loc == '/guest-login') ? null : '/login';
        case SessionState.guest:
          final allowed =
              loc == '/guest' || loc == '/scan' || loc.startsWith('/parcels/');
          if (allowed) return null;
          final target = pending != null && pending!.startsWith('/parcels/')
              ? pending
              : '/guest';
          pending = null;
          return target;
        case SessionState.employee:
          if (entry.contains(loc) || loc == '/guest') {
            final target = pending ?? '/home';
            pending = null;
            return target;
          }
          pending = null;
          return null;
      }
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, _) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
      GoRoute(
        path: '/guest-login',
        builder: (_, _) => const GuestLoginScreen(),
      ),
      GoRoute(path: '/guest', builder: (_, _) => const GuestHomeScreen()),
      GoRoute(
        path: '/scan',
        parentNavigatorKey: rootNavigatorKey,
        builder: (_, _) => const ScanScreen(),
      ),
      GoRoute(
        path: '/create',
        parentNavigatorKey: rootNavigatorKey,
        builder: (_, _) => const CreateParcelScreen(),
      ),
      GoRoute(
        path: '/incidents',
        parentNavigatorKey: rootNavigatorKey,
        builder: (_, _) => const MyReportsScreen(),
        routes: [
          GoRoute(
            path: 'new',
            parentNavigatorKey: rootNavigatorKey,
            builder: (_, _) => const ReportIncidentScreen(),
          ),
          GoRoute(
            path: ':id',
            parentNavigatorKey: rootNavigatorKey,
            builder: (_, s) =>
                IncidentDetailScreen(id: s.pathParameters['id']!),
          ),
        ],
      ),
      // ── ABG ONE modules ──
      GoRoute(
        path: '/tours',
        parentNavigatorKey: rootNavigatorKey,
        builder: (_, _) => const ToursScreen(),
        routes: [
          GoRoute(
            path: 'new',
            parentNavigatorKey: rootNavigatorKey,
            builder: (_, _) => const TourFormScreen(),
          ),
          GoRoute(
            path: ':id',
            parentNavigatorKey: rootNavigatorKey,
            builder: (_, s) => TourDetailScreen(id: s.pathParameters['id']!),
          ),
        ],
      ),
      GoRoute(
        path: '/pool-car',
        parentNavigatorKey: rootNavigatorKey,
        builder: (_, _) => const PoolCarScreen(),
        routes: [
          GoRoute(
            path: 'new',
            parentNavigatorKey: rootNavigatorKey,
            builder: (_, _) => const CarRequestFormScreen(),
          ),
          GoRoute(
            path: 'pass/:token',
            parentNavigatorKey: rootNavigatorKey,
            builder: (_, s) =>
                VehiclePassScreen(token: s.pathParameters['token']!),
          ),
          GoRoute(
            path: ':id',
            parentNavigatorKey: rootNavigatorKey,
            builder: (_, s) =>
                CarRequisitionDetailScreen(id: s.pathParameters['id']!),
          ),
        ],
      ),
      GoRoute(
        path: '/visitors',
        parentNavigatorKey: rootNavigatorKey,
        builder: (_, _) => const VisitorsScreen(),
        routes: [
          GoRoute(
            path: 'new',
            parentNavigatorKey: rootNavigatorKey,
            builder: (_, _) => const VisitorFormScreen(),
          ),
          GoRoute(
            path: 'pass/:token',
            parentNavigatorKey: rootNavigatorKey,
            builder: (_, s) =>
                VisitorPassScreen(token: s.pathParameters['token']!),
          ),
          GoRoute(
            path: ':id',
            parentNavigatorKey: rootNavigatorKey,
            builder: (_, s) => VisitDetailScreen(id: s.pathParameters['id']!),
          ),
        ],
      ),
      GoRoute(
        path: '/licences',
        parentNavigatorKey: rootNavigatorKey,
        builder: (_, _) => const LicencesScreen(),
        routes: [
          GoRoute(
            path: ':id',
            parentNavigatorKey: rootNavigatorKey,
            builder: (_, s) => LicenceDetailScreen(id: s.pathParameters['id']!),
          ),
        ],
      ),
      GoRoute(
        path: '/notices',
        parentNavigatorKey: rootNavigatorKey,
        builder: (_, _) => const NoticesScreen(),
        routes: [
          GoRoute(
            path: ':id',
            parentNavigatorKey: rootNavigatorKey,
            builder: (_, s) => NoticeDetailScreen(id: s.pathParameters['id']!),
          ),
        ],
      ),
      GoRoute(
        path: '/approvals',
        parentNavigatorKey: rootNavigatorKey,
        builder: (_, _) => const ApprovalsScreen(),
      ),
      GoRoute(
        path: '/booked',
        parentNavigatorKey: rootNavigatorKey,
        builder: (_, s) => BookedScreen(result: s.extra! as Json),
      ),
      GoRoute(
        path: '/parcels/:id',
        parentNavigatorKey: rootNavigatorKey,
        builder: (_, s) => ParcelDetailScreen(
          id: s.pathParameters['id']!,
          scannedPayload: s.extra as String?,
        ),
        routes: [
          GoRoute(
            path: 'label',
            parentNavigatorKey: rootNavigatorKey,
            builder: (_, s) => QrLabelScreen(parcel: s.extra! as ParcelDetail),
          ),
        ],
      ),
      GoRoute(
        path: '/parcels',
        parentNavigatorKey: rootNavigatorKey,
        builder: (_, _) => const ParcelsScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (_, _, shell) => AppShell(shell: shell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/home', builder: (_, _) => const HomeScreen()),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                builder: (_, _) => const ProfileScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/alerts',
                builder: (_, _) => const NotificationsScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
}
