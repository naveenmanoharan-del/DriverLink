import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/models.dart';
import '../../services/api_client.dart';
import '../../state/auth_state.dart';
import '../../theme.dart';
import '../../widgets/status_chip.dart';
import '../../widgets/fade_in.dart';
import '../../widgets/load_error.dart';
import 'job_detail_screen.dart';
import 'new_job_screen.dart';

class ClientJobsTab extends StatefulWidget {
  const ClientJobsTab({super.key});

  @override
  State<ClientJobsTab> createState() => _ClientJobsTabState();
}

class _ClientJobsTabState extends State<ClientJobsTab> {
  final _api = ApiClient();
  List<Job> _jobs = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final auth = context.read<AuthState>();
    try {
      final result =
          await _api.get('/v1/jobs/mine', token: auth.accessToken)
              as List<dynamic>;
      if (!mounted) return;
      setState(
        () =>
            _jobs =
                result
                    .map((e) => Job.fromJson(e as Map<String, dynamic>))
                    .toList(),
      );
    } catch (e) {
      if (!mounted) return;
      setState(
        () => _error = messageFor(e, 'Could not load your job postings.'),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My job postings'),
        automaticallyImplyLeading: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () async {
              await Navigator.of(
                context,
              ).push(MaterialPageRoute(builder: (_) => const NewJobScreen()));
              _load();
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child:
            _loading
                ? const Center(child: CircularProgressIndicator())
                : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    if (_error != null)
                      LoadError(message: _error!, onRetry: _load)
                    else if (_jobs.isEmpty)
                      Text(
                        "You haven't posted any jobs yet.",
                        style: dataStyle(size: 13, color: AppColors.slate),
                      ),
                    if (_error == null)
                      for (final (index, job) in _jobs.indexed)
                        FadeIn(
                          delay: Duration(
                            milliseconds: 60 * (index.clamp(0, 8)),
                          ),
                          child: Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: InkWell(
                              onTap: () async {
                                await Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder:
                                        (_) => JobDetailScreen(jobId: job.id),
                                  ),
                                );
                                _load();
                              },
                              child: Padding(
                                padding: const EdgeInsets.all(14),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            job.title,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w800,
                                              fontSize: 16,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            job.location,
                                            style: const TextStyle(
                                              color: AppColors.slate,
                                              fontSize: 13,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    StatusChip(status: job.status),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                  ],
                ),
      ),
    );
  }
}
