/// Official tour requests: apply, follow and approve.
///
/// The router imports these screens from this file; each module may split its
/// code into more files in this folder and re-export them here.
library;

import 'package:flutter/material.dart';

class ToursScreen extends StatelessWidget {
  const ToursScreen({super.key});

  @override
  Widget build(BuildContext context) =>
      Scaffold(appBar: AppBar(title: const Text('Official tours')));
}

class TourFormScreen extends StatelessWidget {
  const TourFormScreen({super.key});

  @override
  Widget build(BuildContext context) =>
      Scaffold(appBar: AppBar(title: const Text('Apply for a tour')));
}

class TourDetailScreen extends StatelessWidget {
  const TourDetailScreen({super.key, required this.id});
  final String id;

  @override
  Widget build(BuildContext context) =>
      Scaffold(appBar: AppBar(title: const Text('Tour request')));
}
