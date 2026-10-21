/// Visitors: invite, gate passes, check-in and check-out.
///
/// The router imports these screens from this file; each module may split its
/// code into more files in this folder and re-export them here.
library;

import 'package:flutter/material.dart';

class VisitorsScreen extends StatelessWidget {
  const VisitorsScreen({super.key});

  @override
  Widget build(BuildContext context) =>
      Scaffold(appBar: AppBar(title: const Text('Visitors')));
}

class VisitorFormScreen extends StatelessWidget {
  const VisitorFormScreen({super.key});

  @override
  Widget build(BuildContext context) =>
      Scaffold(appBar: AppBar(title: const Text('Invite a visitor')));
}

class VisitDetailScreen extends StatelessWidget {
  const VisitDetailScreen({super.key, required this.id});
  final String id;

  @override
  Widget build(BuildContext context) =>
      Scaffold(appBar: AppBar(title: const Text('Visitor')));
}

class VisitorPassScreen extends StatelessWidget {
  const VisitorPassScreen({super.key, required this.token});
  final String token;

  @override
  Widget build(BuildContext context) =>
      Scaffold(appBar: AppBar(title: const Text('Visitor gate pass')));
}
