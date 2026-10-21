/// Pool car requisitions: request, approve, ride, verify at the gate.
///
/// The router imports these screens from this file; each module may split its
/// code into more files in this folder and re-export them here.
library;

import 'package:flutter/material.dart';

class PoolCarScreen extends StatelessWidget {
  const PoolCarScreen({super.key});

  @override
  Widget build(BuildContext context) =>
      Scaffold(appBar: AppBar(title: const Text('Pool car')));
}

class CarRequestFormScreen extends StatelessWidget {
  const CarRequestFormScreen({super.key});

  @override
  Widget build(BuildContext context) =>
      Scaffold(appBar: AppBar(title: const Text('Request a pool car')));
}

class CarRequisitionDetailScreen extends StatelessWidget {
  const CarRequisitionDetailScreen({super.key, required this.id});
  final String id;

  @override
  Widget build(BuildContext context) =>
      Scaffold(appBar: AppBar(title: const Text('Pool car request')));
}

class VehiclePassScreen extends StatelessWidget {
  const VehiclePassScreen({super.key, required this.token});
  final String token;

  @override
  Widget build(BuildContext context) =>
      Scaffold(appBar: AppBar(title: const Text('Vehicle gate pass')));
}
