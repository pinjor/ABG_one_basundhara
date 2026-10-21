/// Regulatory licence register (read-only on mobile).
///
/// The router imports these screens from this file; each module may split its
/// code into more files in this folder and re-export them here.
library;

import 'package:flutter/material.dart';

class LicencesScreen extends StatelessWidget {
  const LicencesScreen({super.key});

  @override
  Widget build(BuildContext context) =>
      Scaffold(appBar: AppBar(title: const Text('Licences')));
}

class LicenceDetailScreen extends StatelessWidget {
  const LicenceDetailScreen({super.key, required this.id});
  final String id;

  @override
  Widget build(BuildContext context) =>
      Scaffold(appBar: AppBar(title: const Text('Licence')));
}
