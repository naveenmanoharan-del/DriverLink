import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../state/auth_state.dart';
import '../../theme.dart';
import '../../widgets/status_chip.dart';

class WorkerProfileTab extends StatefulWidget {
  const WorkerProfileTab({super.key});

  @override
  State<WorkerProfileTab> createState() => _WorkerProfileTabState();
}

class _WorkerProfileTabState extends State<WorkerProfileTab> {
  @override
  void initState() {
    super.initState();
    // Rating and completed-job counts change as jobs finish, so pull a fresh
    // copy rather than showing the snapshot cached at login.
    context.read<AuthState>().refreshProfile();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final profile = auth.workerProfile;

    return Scaffold(
      appBar: AppBar(
        title: const Text('My profile'),
        automaticallyImplyLeading: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await context.read<AuthState>().logout();
              if (context.mounted) {
                Navigator.of(
                  context,
                ).pushNamedAndRemoveUntil('/role-select', (route) => false);
              }
            },
          ),
        ],
      ),
      body:
          profile == null
              ? const Center(child: Text('No profile data'))
              : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Text(
                    'Welcome, ${profile.firstName}',
                    style: displayStyle(size: 28),
                  ),
                  const SizedBox(height: 16),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Wrap(
                            spacing: 8,
                            children: [
                              StatusChip(status: profile.availability),
                              StatusChip(status: profile.verificationStatus),
                            ],
                          ),
                          const Divider(height: 24),
                          _row(
                            'Rate',
                            '${profile.currency} ${profile.minRate} / ${profile.rateUnit}',
                          ),
                          _row(
                            'Rating',
                            '${profile.rating} · ${profile.completedJobs} '
                                '${profile.completedJobs == 1 ? 'job' : 'jobs'}',
                          ),
                          _row('City', profile.city ?? '—'),
                          _row('Experience', '${profile.yearsExperience} yrs'),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: dataStyle(
              size: 11,
              weight: FontWeight.w600,
              color: AppColors.slate,
              letterSpacing: 0.8,
            ),
          ),
          Text(value, style: dataStyle(size: 13, weight: FontWeight.w700)),
        ],
      ),
    );
  }
}
