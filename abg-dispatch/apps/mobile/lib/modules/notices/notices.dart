/// Official notice board: read, open attachments, acknowledge.
///
/// The router imports these screens from this file; each module may split its
/// code into more files in this folder and re-export them here.
library;

import 'package:flutter/material.dart';

class NoticesScreen extends StatelessWidget {
  const NoticesScreen({super.key});

  @override
  Widget build(BuildContext context) =>
      Scaffold(appBar: AppBar(title: const Text('Notice board')));
}

class NoticeDetailScreen extends StatelessWidget {
  const NoticeDetailScreen({super.key, required this.id});
  final String id;

  @override
  Widget build(BuildContext context) =>
      Scaffold(appBar: AppBar(title: const Text('Notice')));
}
