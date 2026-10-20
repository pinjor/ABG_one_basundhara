import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'core/push.dart';
import 'core/session.dart';
import 'data/repository.dart';
import 'l10n/app_localizations.dart';
import 'router.dart';
import 'theme/theme.dart';

class AbgDispatchApp extends StatefulWidget {
  const AbgDispatchApp({super.key});

  @override
  State<AbgDispatchApp> createState() => _AbgDispatchAppState();
}

class _AbgDispatchAppState extends State<AbgDispatchApp>
    with WidgetsBindingObserver {
  late final SessionController _session = context.read<SessionController>();
  late final GoRouter _router = buildRouter(_session);
  StreamSubscription<String>? _pushTaps;
  SessionState? _last;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _session.addListener(_onSession);
    _pushTaps = context.read<PushService>().openedParcel.listen(
      (id) => _router.push('/parcels/$id'),
    );
    unawaited(_session.restore());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _session.removeListener(_onSession);
    unawaited(_pushTaps?.cancel());
    super.dispose();
  }

  void _onSession() {
    if (_session.state == _last) return;
    _last = _session.state;
    final badge = context.read<NotificationBadge>();
    if (_session.state == SessionState.employee) {
      badge.start();
      unawaited(context.read<PushService>().initialiseAfterSignIn());
    } else {
      badge.stop();
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed &&
        _session.state == SessionState.employee) {
      unawaited(context.read<NotificationBadge>().refresh());
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.select<SessionController, String>(
      (s) => s.profile?.locale ?? 'en',
    );
    return MaterialApp.router(
      title: 'ABG Dispatch',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(),
      locale: Locale(locale),
      supportedLocales: L.supportedLocales,
      localizationsDelegates: const [
        L.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      routerConfig: _router,
      builder: (context, child) {
        // Respect the user's text size up to a point that keeps custody screens usable.
        final media = MediaQuery.of(context);
        return MediaQuery(
          data: media.copyWith(
            textScaler: media.textScaler.clamp(
              minScaleFactor: 0.9,
              maxScaleFactor: 1.35,
            ),
          ),
          child: child!,
        );
      },
    );
  }
}
