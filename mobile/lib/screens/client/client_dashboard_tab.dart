import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../state/auth_state.dart';
import '../../theme.dart';
import '../../widgets/app_button.dart';
import 'new_job_screen.dart';

class ClientDashboardTab extends StatefulWidget {
  const ClientDashboardTab({super.key});

  @override
  State<ClientDashboardTab> createState() => _ClientDashboardTabState();
}

class _ClientDashboardTabState extends State<ClientDashboardTab> {
  @override
  void initState() {
    super.initState();
    // Picks up profile edits made elsewhere, including on the website.
    context.read<AuthState>().refreshProfile();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final profile = auth.clientProfile;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
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
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Welcome, ${profile?.name ?? ''}',
              style: displayStyle(size: 26),
            ),
            if (profile?.companyName != null)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  profile!.companyName!,
                  style: dataStyle(size: 13, color: AppColors.slate),
                ),
              ),
            const SizedBox(height: 24),
            AppButton(
              label: 'Post a new job',
              onPressed:
                  () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const NewJobScreen()),
                  ),
            ),
          ],
        ),
      ),
    );
  }
}
