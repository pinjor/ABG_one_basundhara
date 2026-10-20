import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'app.dart';
import 'core/api_client.dart';
import 'core/offline_queue.dart';
import 'core/push.dart';
import 'core/session.dart';
import 'data/repository.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ),
  );

  final api = ApiClient();
  final session = SessionController(api);
  final repo = DispatchRepository(api);
  final queue = OfflineQueue(api);
  await queue.start();

  runApp(
    MultiProvider(
      providers: [
        Provider.value(value: api),
        Provider.value(value: repo),
        Provider(create: (_) => PushService(api)),
        ChangeNotifierProvider.value(value: session),
        ChangeNotifierProvider.value(value: queue),
        ChangeNotifierProvider(create: (_) => NotificationBadge(repo)),
      ],
      child: const AbgDispatchApp(),
    ),
  );
}
