import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/config.dart';
import '../core/formatting.dart';
import '../core/offline_queue.dart';
import '../core/push.dart';
import '../core/session.dart';
import '../data/repository.dart';
import '../l10n/app_localizations.dart';
import '../models/models.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import '../widgets/brand.dart';
import '../widgets/common.dart';

const _roleLabels = {
  'EMPLOYEE': 'Employee',
  'SENDER': 'Sender',
  'RECEIVER': 'Receiver',
  'COURIER_RUNNER': 'Courier / Runner',
  'DISPATCH_OFFICER': 'Dispatch Officer',
  'BRANCH_ADMIN': 'Branch Admin',
  'HEAD_OFFICE_ADMIN': 'Head Office Admin',
  'AUDITOR': 'Auditor',
  'SUPER_ADMIN': 'Super Admin',
};

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  List<Json> _prefs = [];
  List<Json> _sessions = [];

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    final repo = context.read<DispatchRepository>();
    try {
      final r = await Future.wait([repo.preferences(), repo.sessions()]);
      if (mounted) {
        setState(() {
          _prefs = r[0];
          _sessions = r[1];
        });
      }
    } catch (_) {}
  }

  bool _pref(String channel) =>
      _prefs.firstWhere(
        (p) => p['channel'] == channel,
        orElse: () => {'enabled': true},
      )['enabled'] ==
      true;

  Future<void> _setPref(String channel, bool value) async {
    setState(() {
      final i = _prefs.indexWhere((p) => p['channel'] == channel);
      if (i >= 0) _prefs[i] = {..._prefs[i], 'enabled': value};
    });
    await context.read<DispatchRepository>().setPreference(channel, value);
  }

  Future<void> _signOut() async {
    final l = L.of(context);
    final session = context.read<SessionController>();
    final push = context.read<PushService>();
    final queue = context.read<OfflineQueue>();
    final badge = context.read<NotificationBadge>();
    if (!await confirmDialog(
      context,
      title: l.signOut,
      body: l.signOutConfirm,
      confirm: l.signOut,
      destructive: true,
    )) {
      return;
    }
    await push.unregister();
    await queue.clear();
    badge.stop();
    await session.logout();
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final session = context.watch<SessionController>();
    final p = session.profile;
    final e = p?.employee;
    final top = MediaQuery.of(context).padding.top;
    return Scaffold(
      body: ListView(
        padding: EdgeInsets.zero,
        children: [
          HeroBackground(
            borderRadius: const BorderRadius.vertical(
              bottom: Radius.circular(30),
            ),
            child: Padding(
              padding: EdgeInsets.fromLTRB(
                AbgSpace.gutter,
                top + 18,
                AbgSpace.gutter,
                28,
              ),
              child: Column(
                children: [
                  Avatar(initials: e?.initials ?? '?', size: 84, dark: true),
                  const SizedBox(height: 14),
                  Text(
                    p?.displayName ?? '',
                    style: AbgText.h1.copyWith(color: Colors.white),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    [e?.designation, e?.code].whereType<String>().join(' · '),
                    style: AbgText.small.copyWith(color: AbgColors.platinum),
                  ),
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    alignment: WrapAlignment.center,
                    children: (p?.roles ?? [])
                        .map(
                          (r) => Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 5,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(99),
                              border: Border.all(color: Colors.white24),
                            ),
                            child: Text(
                              _roleLabels[r] ?? r,
                              style: AbgText.caption.copyWith(
                                color: AbgColors.platinumBright,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        )
                        .toList(),
                  ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AbgSpace.gutter,
              20,
              AbgSpace.gutter,
              120,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SectionCard(
                  child: Column(
                    children: [
                      InfoRow(
                        icon: Icons.badge_outlined,
                        label: l.employeeId,
                        value: e?.code ?? '—',
                      ),
                      InfoRow(
                        icon: Icons.account_tree_outlined,
                        label: l.department,
                        value: e?.department ?? '—',
                      ),
                      InfoRow(
                        icon: Icons.apartment_rounded,
                        label: l.office,
                        value: [
                          e?.branch,
                          p?.defaultLocation?.split(' › ').skip(1).join(' › '),
                        ].where((s) => s != null && s.isNotEmpty).join(' · '),
                      ),
                      InfoRow(
                        icon: Icons.phone_outlined,
                        label: l.phone,
                        value: e?.phone ?? '—',
                      ),
                      InfoRow(
                        icon: Icons.alternate_email_rounded,
                        label: l.email,
                        value: p?.email ?? '—',
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                SectionTitle(l.settings),
                SectionCard(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Column(
                    children: [
                      ListTile(
                        leading: const Icon(
                          Icons.translate_rounded,
                          color: AbgColors.navy500,
                        ),
                        title: Text(
                          l.language,
                          style: AbgText.bodyStrong.copyWith(fontSize: 14.5),
                        ),
                        trailing: SegmentedButton<String>(
                          showSelectedIcon: false,
                          segments: const [
                            ButtonSegment(value: 'en', label: Text('EN')),
                            ButtonSegment(value: 'bn', label: Text('বাং')),
                          ],
                          selected: {p?.locale ?? 'en'},
                          onSelectionChanged: (s) => session.setLocale(s.first),
                        ),
                      ),
                      const Divider(indent: 16, endIndent: 16),
                      SwitchListTile(
                        secondary: const Icon(
                          Icons.notifications_active_outlined,
                          color: AbgColors.navy500,
                        ),
                        title: Text(
                          l.pushNotifications,
                          style: AbgText.bodyStrong.copyWith(fontSize: 14.5),
                        ),
                        value: _pref('PUSH'),
                        onChanged: (v) => _setPref('PUSH', v),
                      ),
                      SwitchListTile(
                        secondary: const Icon(
                          Icons.sms_outlined,
                          color: AbgColors.navy500,
                        ),
                        title: Text(
                          l.smsNotifications,
                          style: AbgText.bodyStrong.copyWith(fontSize: 14.5),
                        ),
                        value: _pref('SMS'),
                        onChanged: (v) => _setPref('SMS', v),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                SectionTitle(l.sessions),
                SectionCard(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Column(
                    children: _sessions.isEmpty
                        ? [
                            const Padding(
                              padding: EdgeInsets.all(16),
                              child: Skeleton(height: 14),
                            ),
                          ]
                        : _sessions
                              .map(
                                (s) => ListTile(
                                  leading: Icon(
                                    s['platform'] == 'web'
                                        ? Icons.laptop_mac_rounded
                                        : Icons.phone_iphone_rounded,
                                    color: AbgColors.navy500,
                                  ),
                                  title: Text(
                                    s['current'] == true
                                        ? l.thisDevice
                                        : (s['deviceName'] as String? ??
                                              'Device'),
                                    style: AbgText.bodyStrong.copyWith(
                                      fontSize: 14,
                                    ),
                                  ),
                                  subtitle: Text(
                                    fullStamp(
                                      DateTime.parse(s['lastUsedAt'] as String),
                                      l.localeName,
                                    ),
                                    style: AbgText.caption,
                                  ),
                                  trailing: s['current'] == true
                                      ? const Icon(
                                          Icons.check_circle_rounded,
                                          color: AbgColors.success,
                                        )
                                      : IconButton(
                                          tooltip: l.signOut,
                                          icon: const Icon(
                                            Icons.logout_rounded,
                                          ),
                                          onPressed: () async {
                                            await context
                                                .read<DispatchRepository>()
                                                .revokeSession(
                                                  s['id'] as String,
                                                );
                                            unawaited(_load());
                                          },
                                        ),
                                ),
                              )
                              .toList(),
                  ),
                ),
                const SizedBox(height: 20),
                SectionCard(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Column(
                    children: [
                      ListTile(
                        leading: const Icon(
                          Icons.support_agent_rounded,
                          color: AbgColors.navy500,
                        ),
                        title: Text(
                          l.help,
                          style: AbgText.bodyStrong.copyWith(fontSize: 14.5),
                        ),
                        trailing: const Icon(Icons.chevron_right_rounded),
                        onTap: () => showDialog(
                          context: context,
                          builder: (_) => AlertDialog(
                            title: Text(l.help),
                            content: Text(l.helpBody),
                          ),
                        ),
                      ),
                      ListTile(
                        leading: const Icon(
                          Icons.privacy_tip_outlined,
                          color: AbgColors.navy500,
                        ),
                        title: Text(
                          l.privacy,
                          style: AbgText.bodyStrong.copyWith(fontSize: 14.5),
                        ),
                        trailing: const Icon(Icons.chevron_right_rounded),
                        onTap: () => showDialog(
                          context: context,
                          builder: (_) => AlertDialog(
                            title: Text(l.privacy),
                            content: Text(l.privacyBody),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AbgColors.danger,
                    side: BorderSide(
                      color: AbgColors.danger.withValues(alpha: 0.4),
                    ),
                  ),
                  onPressed: _signOut,
                  icon: const Icon(Icons.logout_rounded),
                  label: Text(l.signOut),
                ),
                const SizedBox(height: 22),
                Center(
                  child: Text(
                    '${l.orgName} · ${l.version(AppConfig.appVersion)}',
                    style: AbgText.caption,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
