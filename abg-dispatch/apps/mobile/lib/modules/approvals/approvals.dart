/// Everything waiting for my approval: tours and pool cars.
///
/// The router imports these screens from this file; each module may split its
/// code into more files in this folder and re-export them here.
library;

import 'package:flutter/material.dart';

class ApprovalsScreen extends StatelessWidget {
  const ApprovalsScreen({super.key});

  @override
  Widget build(BuildContext context) =>
      Scaffold(appBar: AppBar(title: const Text('Approvals')));
}
