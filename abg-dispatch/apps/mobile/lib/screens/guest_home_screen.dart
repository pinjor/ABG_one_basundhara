import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/offline_queue.dart';
import '../core/session.dart';
import '../data/repository.dart';
import '../l10n/app_localizations.dart';
import '../models/models.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import '../widgets/brand.dart';
import '../widgets/common.dart';
import '../widgets/parcel_card.dart';
import '../widgets/sync_banner.dart';

/// The whole app for a guest carrier: their assignments and a scanner.
class GuestHomeScreen extends StatefulWidget {
  const GuestHomeScreen({super.key});

  @override
  State<GuestHomeScreen> createState() => _GuestHomeScreenState();
}

class _GuestHomeScreenState extends State<GuestHomeScreen> {
  List<ParcelRow> _items = [];
  bool _loading = true;
  Object? _error;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    try {
      final page = await context.read<DispatchRepository>().parcels();
      if (mounted) {
        setState(() {
          _items = page.items;
          _loading = false;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e;
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final guest = context.watch<SessionController>().guest;
    final top = MediaQuery.of(context).padding.top;
    return Scaffold(
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
      floatingActionButton: SizedBox(
        width: MediaQuery.of(context).size.width - 40,
        child: PlatinumButton(
          label: l.scanTitle,
          icon: Icons.qr_code_scanner_rounded,
          onPressed: () => context.push('/scan'),
        ),
      ),
      body: RefreshIndicator(
        color: AbgColors.navy,
        onRefresh: _load,
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            HeroBackground(
              borderRadius: const BorderRadius.vertical(
                bottom: Radius.circular(30),
              ),
              child: Padding(
                padding: EdgeInsets.fromLTRB(AbgSpace.gutter, top + 14, 8, 26),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const AbgLogo(width: 64, markOnly: true),
                        const SizedBox(width: 10),
                        const DispatchWordmark(size: 11),
                        const Spacer(),
                        IconButton(
                          tooltip: l.signOut,
                          onPressed: () async {
                            final session = context.read<SessionController>();
                            await context.read<OfflineQueue>().clear();
                            await session.logout();
                          },
                          icon: const Icon(
                            Icons.logout_rounded,
                            color: AbgColors.platinumBright,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 22),
                    Text(
                      l.guestHello(guest?.fullName ?? ''),
                      style: AbgText.h1.copyWith(color: Colors.white),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      [
                        guest?.company,
                        guest?.vehicleNumber,
                      ].whereType<String>().join(' · '),
                      style: AbgText.small.copyWith(color: AbgColors.platinum),
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AbgSpace.gutter,
                18,
                AbgSpace.gutter,
                120,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SyncBanner(),
                  SectionTitle(l.guestAssignments),
                  if (_loading) const SkeletonCard(),
                  if (_error != null)
                    ErrorPanel(error: _error!, onRetry: _load),
                  if (!_loading && _error == null && _items.isEmpty)
                    EmptyState(
                      icon: Icons.inventory_2_outlined,
                      title: l.guestNoAssignments,
                    ),
                  ..._items.map(
                    (p) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: ParcelCard(
                        parcel: p,
                        onTap: () async {
                          await context.push('/parcels/${p.id}');
                          if (mounted) unawaited(_load());
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.info_outline_rounded,
                        size: 16,
                        color: AbgColors.inkSubtle,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(l.guestSessionNote, style: AbgText.caption),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
