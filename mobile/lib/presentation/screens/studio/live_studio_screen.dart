// ============================================================
// OmniCast - Live Studio Screen (Staff/Admin)
// ============================================================
//
// The Studio control surface. Two flows:
//
//   1. CURATED LIVE (Chọn nội dung phát lên màn hình)
//      Pick one or more existing recordings from the channel's
//      library and mark them LIVE NOW. The anti-piracy guard on
//      the backend rejects YouTube/Twitch/Vimeo/etc. — only
//      royalty-free or self-uploaded content is shown here.
//
//   2. SELF-RECORD (Tự ghi hình nội dung Livestream)
//      Capture a video with the device camera and either:
//        • save as a Recording,
//        • push LIVE immediately,
//        • or keep as a Staff-only draft.
//
// Both flows are gated to STAFF/ADMIN. The bottom of the screen
// shows the current LIVE status of the selected channel with a
// big red STOP button.
// ============================================================

import 'dart:async';
import 'dart:io';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:video_player/video_player.dart';

import '../../../core/di/injection.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/app_constants.dart';
import '../../../data/models/channel_model.dart';
import '../../../data/models/recording_model.dart';
import '../../../data/models/studio_catalog_model.dart';
import '../../../data/repositories/channels_repository.dart';
import '../../../data/repositories/live_studio_repository.dart';
import '../../widgets/channel_logo.dart';

class LiveStudioScreen extends StatefulWidget {
  /// Optional initial channel slug (when navigated from a channel page).
  final String? initialChannelSlug;
  const LiveStudioScreen({super.key, this.initialChannelSlug});

  @override
  State<LiveStudioScreen> createState() => _LiveStudioScreenState();
}

class _LiveStudioScreenState extends State<LiveStudioScreen>
    with SingleTickerProviderStateMixin {
  static const _accent = Color(0xFF00E5FF);
  static const _danger = Color(0xFFFF2A55);
  static const _warn = Color(0xFFF59E0B);

  late final LiveStudioRepository _repo = getIt<LiveStudioRepository>();
  late final ChannelsRepository _channelsRepo = getIt<ChannelsRepository>();
  late final TabController _tabController = TabController(length: 3, vsync: this);

  final TextEditingController _searchCtrl = TextEditingController();
  final TextEditingController _catalogSearchCtrl = TextEditingController();
  Timer? _searchDebounce;
  Timer? _catalogSearchDebounce;

  // Channel selector
  List<ChannelModel> _channels = [];
  ChannelModel? _selected;
  bool _loadingChannels = true;

  // Curated live state
  List<RecordingModel> _recordings = [];
  bool _loadingRecordings = false;
  String? _recordingsError;
  final Set<String> _selectedRecordingIds = <String>{};

  // Catalog (Mode 3) state
  List<StudioCatalogStreamModel> _catalogStreams = [];
  StudioCatalogSummary? _catalogSummary;
  bool _loadingCatalog = false;
  String? _catalogError;
  final Set<String> _addedCatalogIds = <String>{};
  bool _onlyVerified = true;

  // Self-record state
  final ImagePicker _picker = ImagePicker();
  XFile? _pickedFile;
  int? _pickedFileDurationSec;
  double _uploadProgress = 0;
  bool _uploading = false;
  String? _uploadError;
  final TextEditingController _selfTitleCtrl = TextEditingController();
  final TextEditingController _selfDescCtrl = TextEditingController();
  SelfRecordVisibility _selfVisibility = SelfRecordVisibility.immediate;

  // Active LIVE state (banner)
  ActiveLiveState? _activeLive;
  bool _stopping = false;

  @override
  void initState() {
    super.initState();
    _loadChannels();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchCtrl.dispose();
    _catalogSearchCtrl.dispose();
    _selfTitleCtrl.dispose();
    _selfDescCtrl.dispose();
    _searchDebounce?.cancel();
    _catalogSearchDebounce?.cancel();
    super.dispose();
  }

  // ============================================================
  // Data loading
  // ============================================================

  Future<void> _loadChannels() async {
    setState(() => _loadingChannels = true);
    try {
      final page = await _channelsRepo.getChannels(limit: 50, isActive: true);
      final list = page.items
          .where((c) => c.isActive)
          .toList(growable: false);
      ChannelModel? initial;
      if (widget.initialChannelSlug != null) {
        for (final c in list) {
          if (c.slug == widget.initialChannelSlug) {
            initial = c;
            break;
          }
        }
      }
      setState(() {
        _channels = list;
        _selected ??= initial ?? (list.isNotEmpty ? list.first : null);
        _loadingChannels = false;
      });
      if (_selected != null) {
        _onChannelChanged();
      }
    } catch (_) {
      if (mounted) setState(() => _loadingChannels = false);
    }
  }

  void _onChannelChanged() {
    _selectedRecordingIds.clear();
    _recordings = [];
    _recordingsError = null;
    _activeLive = null;
    _pickedFile = null;
    _pickedFileDurationSec = null;
    _uploadProgress = 0;
    _uploadError = null;
    _addedCatalogIds.clear();
    if (_selected != null) {
      _loadRecordings();
      _loadActiveLive();
      _loadCatalog();
    }
  }

  Future<void> _loadRecordings({String? search}) async {
    if (_selected == null) return;
    setState(() {
      _loadingRecordings = true;
      _recordingsError = null;
    });
    try {
      final list = await _repo.listBroadcastableRecordings(
        channelId: _selected!.slug,
        search: search,
        limit: 50,
      );
      if (mounted) {
        setState(() {
          _recordings = list;
          _loadingRecordings = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _recordingsError = e.toString();
          _loadingRecordings = false;
        });
      }
    }
  }

  Future<void> _loadActiveLive() async {
    if (_selected == null) return;
    try {
      final result = await getIt<DioClient>().get(
        AppEndpoints.liveNow,
      );
      final raw = result.data;
      final list = (raw is Map && raw['data'] is List)
          ? raw['data'] as List
          : (raw is List ? raw : const <dynamic>[]);
      ActiveLiveState? found;
      for (final rawEv in list) {
        final m = rawEv as Map<String, dynamic>;
        final channelSlug = m['channel']?['slug']?.toString() ?? '';
        final channelId = m['channelId']?.toString() ?? '';
        if (channelSlug == _selected!.slug || channelId == _selected!.id) {
          found = ActiveLiveState(
            eventId: m['id']?.toString() ?? '',
            title: m['title']?.toString() ?? '',
            viewerCount: (m['viewerCount'] as num?)?.toInt() ?? 0,
            startedAt: DateTime.tryParse(m['startedAt']?.toString() ?? '') ??
                DateTime.now(),
          );
          break;
        }
      }
      if (mounted) {
        setState(() => _activeLive = found);
      }
    } catch (_) {
      // Soft-fail — banner just hides itself.
    }
  }

  // ============================================================
  // Curated live actions
  // ============================================================

  void _toggleSelection(String id) {
    setState(() {
      if (_selectedRecordingIds.contains(id)) {
        _selectedRecordingIds.remove(id);
      } else {
        _selectedRecordingIds.add(id);
      }
    });
  }

  Future<void> _goLiveCurated() async {
    if (_selected == null) {
      _toast('Vui lòng chọn kênh trước.');
      return;
    }
    if (_selectedRecordingIds.isEmpty) {
      _toast('Chọn ít nhất 1 nội dung để phát.');
      return;
    }
    final confirmed = await _confirmDialog(
      title: 'Phát sóng trực tiếp?',
      message:
          'Kênh "${_selected!.name}" sẽ chuyển sang LIVE NOW với ${_selectedRecordingIds.length} nội dung đã chọn. Mọi sự kiện LIVE đang chạy trên kênh này sẽ được kết thúc.',
      confirmLabel: 'PHÁT NGAY',
      accent: _danger,
    );
    if (confirmed != true) return;

    HapticFeedback.mediumImpact();
    try {
      final result = await _repo.curateLive(
        channelId: _selected!.slug,
        recordingIds: _selectedRecordingIds.toList(growable: false),
      );
      if (!mounted) return;
      _toast(result.message, accent: _accent);
      _selectedRecordingIds.clear();
      await _loadActiveLive();
    } catch (e) {
      if (!mounted) return;
      _toast(_friendlyError(e), accent: _danger);
    }
  }

  Future<void> _stopLive() async {
    if (_activeLive == null) return;
    final confirmed = await _confirmDialog(
      title: 'Kết thúc phát sóng?',
      message: 'Kênh "${_selected!.name}" sẽ dừng phát "${_activeLive!.title}".',
      confirmLabel: 'KẾT THÚC',
      accent: _danger,
    );
    if (confirmed != true) return;
    setState(() => _stopping = true);
    try {
      final result = await _repo.stopLive(eventId: _activeLive!.eventId);
      if (!mounted) return;
      _toast(result.message);
      await _loadActiveLive();
    } catch (e) {
      if (!mounted) return;
      _toast(_friendlyError(e), accent: _danger);
    } finally {
      if (mounted) setState(() => _stopping = false);
    }
  }

  // ============================================================
  // Self-record actions
  // ============================================================

  Future<void> _captureFromCamera() async {
    try {
      final file = await _picker.pickVideo(
        source: ImageSource.camera,
        maxDuration: const Duration(minutes: 30),
        preferredCameraDevice: CameraDevice.rear,
      );
      if (file == null) return;
      _onPickedFile(file, fromCamera: true);
    } catch (e) {
      _toast('Không thể mở camera: $e', accent: _danger);
    }
  }

  Future<void> _pickFromGallery() async {
    try {
      final file = await _picker.pickVideo(source: ImageSource.gallery);
      if (file == null) return;
      _onPickedFile(file, fromCamera: false);
    } catch (e) {
      _toast('Không thể mở thư viện: $e', accent: _danger);
    }
  }

  void _onPickedFile(XFile file, {required bool fromCamera}) {
    setState(() {
      _pickedFile = file;
      _pickedFileDurationSec = null;
      _uploadProgress = 0;
      _uploadError = null;
    });
    _probeDuration(file);
  }

  Future<void> _probeDuration(XFile file) async {
    // image_picker doesn't expose duration directly. Use a hidden
    // VideoPlayer probe to read it (best-effort, ~1s). Failures are
    // silent and the user can re-record / re-pick.
    try {
      final controller = VideoPlayerController.file(File(file.path));
      await controller.initialize();
      final dur = controller.value.duration;
      await controller.dispose();
      if (mounted && dur.inSeconds > 0) {
        setState(() => _pickedFileDurationSec = dur.inSeconds);
      }
    } catch (_) {
      // No-op — user can still upload without auto-detected duration.
    }
  }

  Future<void> _uploadAndBroadcast() async {
    if (_selected == null) {
      _toast('Vui lòng chọn kênh trước.');
      return;
    }
    if (_pickedFile == null) {
      _toast('Hãy quay hoặc chọn video trước.');
      return;
    }
    final title = _selfTitleCtrl.text.trim();
    if (title.isEmpty) {
      _toast('Vui lòng nhập tiêu đề.');
      return;
    }
    final duration = (_pickedFileDurationSec != null && _pickedFileDurationSec! > 0)
        ? _pickedFileDurationSec!
        : 60;

    setState(() {
      _uploading = true;
      _uploadProgress = 0;
      _uploadError = null;
    });

    try {
      final url = await _repo.uploadSelfRecordFile(
        file: File(_pickedFile!.path),
        title: title,
        onProgress: (sent, total) {
          if (mounted) {
            setState(() => _uploadProgress = sent / total);
          }
        },
      );
      final result = await _repo.uploadSelfRecord(
        channelId: _selected!.slug,
        title: title,
        description:
            _selfDescCtrl.text.trim().isEmpty ? null : _selfDescCtrl.text.trim(),
        videoUrl: url,
        duration: duration,
        tags: const ['self-recorded', 'studio'],
        visibility: _selfVisibility,
      );
      if (!mounted) return;
      _toast(result.message, accent: _accent);
      // Reset form
      setState(() {
        _pickedFile = null;
        _pickedFileDurationSec = null;
        _uploadProgress = 0;
        _selfTitleCtrl.clear();
        _selfDescCtrl.clear();
      });
      await _loadActiveLive();
    } catch (e) {
      if (!mounted) return;
      setState(() => _uploadError = _friendlyError(e));
      _toast(_uploadError!, accent: _danger);
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  // ============================================================
  // Catalog (Mode 3) actions
  // ============================================================

  Future<void> _loadCatalog({String? search}) async {
    if (_selected == null) return;
    setState(() {
      _loadingCatalog = true;
      _catalogError = null;
    });
    try {
      final page = await _repo.listCatalogStreams(
        channel: _selected!.slug,
        verifiedOnly: _onlyVerified,
        search: search,
      );
      if (mounted) {
        setState(() {
          _catalogStreams = page.items;
          _catalogSummary = page.summary;
          _loadingCatalog = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _catalogError = e.toString();
          _loadingCatalog = false;
        });
      }
    }
  }

  Future<void> _addFromCatalog(StudioCatalogStreamModel entry) async {
    if (_selected == null) return;
    try {
      final res = await _repo.addFromCatalog(
        channelId: _selected!.slug,
        catalogId: entry.id,
      );
      if (!mounted) return;
      setState(() => _addedCatalogIds.add(entry.id));
      _toast(
        res.message.isNotEmpty
            ? res.message
            : 'Đã thêm "${entry.title}" vào kênh ${_selected!.name}.',
        accent: _accent,
      );
    } catch (e) {
      if (!mounted) return;
      _toast(_friendlyError(e), accent: _danger);
    }
  }

  // ============================================================
  // UI helpers
  // ============================================================

  void _toast(String message, {Color? accent}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: accent ?? const Color(0xFF0B1320),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  String _friendlyError(Object e) {
    final raw = e.toString();
    if (raw.contains('403')) {
      return 'Nội dung này thuộc nguồn bản quyền, không thể phát trực tiếp.';
    }
    if (raw.contains('401')) return 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
    if (raw.contains('400')) return 'Yêu cầu không hợp lệ. Kiểm tra lại các trường.';
    if (raw.contains('404')) return 'Không tìm thấy kênh hoặc nội dung.';
    if (raw.length > 200) return 'Có lỗi xảy ra, vui lòng thử lại.';
    return raw;
  }

  Future<bool?> _confirmDialog({
    required String title,
    required String message,
    required String confirmLabel,
    Color? accent,
  }) {
    return showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0B1320),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0x3300E5FF), width: 0.8),
        ),
        title: Text(
          title,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w800,
            fontFamily: 'Outfit',
          ),
        ),
        content: Text(
          message,
          style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 13, height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Hủy', style: TextStyle(color: Color(0xFF94A3B8))),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(
              confirmLabel,
              style: TextStyle(
                color: accent ?? _accent,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.5,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ============================================================
  // Build
  // ============================================================

  @override
  Widget build(BuildContext context) {
    if (_loadingChannels) {
      return Scaffold(
        backgroundColor: AppColors.bg,
        appBar: _buildAppBar(),
        body: const Center(child: CircularProgressIndicator(color: _accent)),
      );
    }
    if (_channels.isEmpty) {
      return Scaffold(
        backgroundColor: AppColors.bg,
        appBar: _buildAppBar(),
        body: const Center(
          child: Text(
            'Không tìm thấy kênh nào.',
            style: TextStyle(color: Colors.white70),
          ),
        ),
      );
    }
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: _buildAppBar(),
      body: Column(
        children: [
          _buildChannelChips(),
          if (_activeLive != null) _buildActiveLiveBanner(),
          _buildTabBar(),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildCuratedTab(),
                _buildSelfRecordTab(),
                _buildCatalogTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: AppColors.bg,
      elevation: 0,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
        onPressed: () => context.canPop() ? context.pop() : context.go('/home'),
      ),
      title: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Live Studio',
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w800,
              fontFamily: 'Outfit',
            ),
          ),
          Text(
            'CURATED & SELF-RECORD BROADCAST',
            style: TextStyle(
              color: _accent,
              fontSize: 9,
              fontFamily: 'JetBrainsMono',
              fontWeight: FontWeight.w700,
              letterSpacing: 1.1,
            ),
          ),
        ],
      ),
      actions: [
        IconButton(
          tooltip: 'Làm mới',
          icon: const Icon(Icons.refresh, color: _accent),
          onPressed: _onChannelChanged,
        ),
      ],
    );
  }

  Widget _buildChannelChips() {
    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _channels.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final c = _channels[i];
          final selected = c.id == _selected?.id;
          return GestureDetector(
            onTap: () {
              setState(() => _selected = c);
              _onChannelChanged();
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: selected
                    ? _accent.withValues(alpha: 0.18)
                    : const Color(0xFF0B1320),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: selected
                      ? _accent
                      : const Color(0x1F00E5FF).withValues(alpha: 0.6),
                  width: 1,
                ),
              ),
              child: Row(
                children: [
                  ChannelLogo(channel: c, size: 28),
                  const SizedBox(width: 8),
                  Text(
                    c.name,
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                      fontFamily: 'Outfit',
                    ),
                  ),
                  if (c.isVerified) ...[
                    const SizedBox(width: 4),
                    const Icon(Icons.verified, color: _accent, size: 14),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildActiveLiveBanner() {
    final live = _activeLive!;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0x33FF2A55), Color(0x11000000)],
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _danger.withValues(alpha: 0.5), width: 1),
      ),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(
              color: _danger,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          const Text(
            'ĐANG PHÁT',
            style: TextStyle(
              color: _danger,
              fontFamily: 'JetBrainsMono',
              fontSize: 10,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              live.title,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Text(
            '${live.viewerCount} xem',
            style: const TextStyle(color: Colors.white70, fontSize: 11),
          ),
          const SizedBox(width: 12),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: _danger,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            onPressed: _stopping ? null : _stopLive,
            icon: _stopping
                ? const SizedBox(
                    width: 12,
                    height: 12,
                    child: CircularProgressIndicator(strokeWidth: 1.6, color: Colors.white),
                  )
                : const Icon(Icons.stop_circle, size: 16),
            label: const Text(
              'DỪNG',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.5),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabBar() {
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 8, 12, 8),
      decoration: BoxDecoration(
        color: const Color(0xFF0B1320),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0x1F00E5FF), width: 0.8),
      ),
      child: TabBar(
        controller: _tabController,
        isScrollable: true,
        tabAlignment: TabAlignment.start,
        indicator: BoxDecoration(
          color: _accent.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(10),
        ),
        indicatorPadding: const EdgeInsets.all(4),
        labelColor: _accent,
        unselectedLabelColor: const Color(0xFF94A3B8),
        labelStyle: const TextStyle(
          fontWeight: FontWeight.w800,
          fontFamily: 'Outfit',
          letterSpacing: 0.5,
          fontSize: 12,
        ),
        unselectedLabelStyle: const TextStyle(
          fontWeight: FontWeight.w700,
          fontFamily: 'Outfit',
          fontSize: 12,
        ),
        tabs: const [
          Tab(text: 'CHỌN NỘI DUNG'),
          Tab(text: 'TỰ GHI HÌNH'),
          Tab(text: 'DANH MỤC NGUỒN'),
        ],
      ),
    );
  }

  // ─── Tab 1: Curated live ──────────────────────────────────────
  Widget _buildCuratedTab() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
          child: TextField(
            controller: _searchCtrl,
            style: const TextStyle(color: Colors.white, fontSize: 14),
            onChanged: (s) {
              _searchDebounce?.cancel();
              _searchDebounce = Timer(
                const Duration(milliseconds: 400),
                () => _loadRecordings(search: s.trim().isEmpty ? null : s.trim()),
              );
            },
            decoration: InputDecoration(
              hintText: 'Tìm nội dung...',
              hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
              prefixIcon: const Icon(Icons.search, color: _accent, size: 20),
              filled: true,
              fillColor: const Color(0xFF0B1320),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
            ),
          ),
        ),
        if (_loadingRecordings)
          const Padding(
            padding: EdgeInsets.all(40),
            child: CircularProgressIndicator(color: _accent),
          )
        else if (_recordingsError != null)
          Padding(
            padding: const EdgeInsets.all(20),
            child: Text(
              'Lỗi tải danh sách: $_recordingsError',
              style: const TextStyle(color: _danger, fontSize: 12),
            ),
          )
        else if (_recordings.isEmpty)
          Padding(
            padding: const EdgeInsets.all(40),
            child: Column(
              children: const [
                Icon(Icons.video_library_outlined, color: Color(0xFF475569), size: 48),
                SizedBox(height: 12),
                Text(
                  'Kênh này chưa có nội dung royalty-free để phát trực tiếp.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                ),
                SizedBox(height: 4),
                Text(
                  'Hãy thêm video qua mục "Tự ghi hình" hoặc import nguồn nội bộ.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Color(0xFF64748B), fontSize: 11),
                ),
              ],
            ),
          )
        else
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 100),
              itemCount: _recordings.length,
              itemBuilder: (context, i) => _buildRecordingTile(_recordings[i]),
            ),
          ),
        if (_selectedRecordingIds.isNotEmpty)
          _buildGoLiveFloatingBar(),
      ],
    );
  }

  Widget _buildRecordingTile(RecordingModel r) {
    final isSelected = _selectedRecordingIds.contains(r.id);
    return GestureDetector(
      onTap: () => _toggleSelection(r.id),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: const Color(0xFF0B1320),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? _accent : const Color(0x1F00E5FF).withValues(alpha: 0.4),
            width: isSelected ? 1.5 : 0.8,
          ),
        ),
        child: Row(
          children: [
            // Thumbnail
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: SizedBox(
                width: 80,
                height: 48,
                child: r.thumbnailUrl != null && r.thumbnailUrl!.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl: r.thumbnailUrl!,
                        fit: BoxFit.cover,
                        errorWidget: (_, __, ___) => _thumbPlaceholder(r),
                        placeholder: (_, __) => _thumbPlaceholder(r),
                      )
                    : _thumbPlaceholder(r),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    r.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      _badge(
                        icon: Icons.schedule,
                        label: _formatDuration(r.duration),
                      ),
                      const SizedBox(width: 6),
                      _badge(
                        icon: Icons.verified_user,
                        label: r.contentSource == 'UPLOADED' ? 'Tự upload' : 'Nội bộ',
                        color: const Color(0xFF22C55E),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                color: isSelected ? _accent : Colors.transparent,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(
                  color: isSelected ? _accent : const Color(0xFF475569),
                  width: 1.5,
                ),
              ),
              child: isSelected
                  ? const Icon(Icons.check, size: 16, color: Colors.black)
                  : null,
            ),
          ],
        ),
      ),
    );
  }

  Widget _thumbPlaceholder(RecordingModel r) {
    return Container(
      color: const Color(0xFF0F172A),
      alignment: Alignment.center,
      child: const Icon(Icons.play_circle_outline, color: Color(0xFF475569), size: 24),
    );
  }

  Widget _badge({required IconData icon, required String label, Color? color}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: (color ?? _accent).withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 10, color: color ?? _accent),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: color ?? _accent,
              fontSize: 10,
              fontWeight: FontWeight.w700,
              fontFamily: 'JetBrainsMono',
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGoLiveFloatingBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: const BoxDecoration(
        color: Color(0xFF0B1320),
        border: Border(top: BorderSide(color: Color(0x1F00E5FF), width: 0.8)),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: _accent.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '${_selectedRecordingIds.length} đã chọn',
                style: const TextStyle(
                  color: _accent,
                  fontWeight: FontWeight.w800,
                  fontFamily: 'JetBrainsMono',
                  fontSize: 12,
                ),
              ),
            ),
            const Spacer(),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: _danger,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 8,
                shadowColor: _danger.withValues(alpha: 0.4),
              ),
              onPressed: _goLiveCurated,
              icon: const Icon(Icons.podcasts, size: 18),
              label: const Text(
                'PHÁT NGAY',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.2,
                  fontFamily: 'Outfit',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Tab 2: Self-record ───────────────────────────────────────
  Widget _buildSelfRecordTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(12, 4, 12, 100),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Capture buttons
          Row(
            children: [
              Expanded(
                child: _captureActionButton(
                  icon: Icons.videocam,
                  label: 'QUAY NGAY',
                  subtitle: 'Dùng camera điện thoại',
                  accent: _danger,
                  onTap: _captureFromCamera,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _captureActionButton(
                  icon: Icons.photo_library,
                  label: 'TỪ THƯ VIỆN',
                  subtitle: 'Chọn video có sẵn',
                  accent: _accent,
                  onTap: _pickFromGallery,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Picked file preview
          if (_pickedFile != null) ...[
            _buildPickedFilePreview(),
            const SizedBox(height: 16),
          ],

          // Title
          _fieldLabel('TIÊU ĐỀ *'),
          TextField(
            controller: _selfTitleCtrl,
            style: const TextStyle(color: Colors.white, fontSize: 14),
            decoration: _inputDecoration(hint: 'Trực tiếp từ studio...'),
            maxLength: 255,
          ),

          const SizedBox(height: 8),

          // Description (optional)
          _fieldLabel('MÔ TẢ'),
          TextField(
            controller: _selfDescCtrl,
            style: const TextStyle(color: Colors.white, fontSize: 13),
            decoration: _inputDecoration(hint: 'Mô tả ngắn (tùy chọn)'),
            maxLines: 3,
            maxLength: 600,
          ),

          const SizedBox(height: 8),

          // Visibility
          _fieldLabel('CHẾ ĐỘ PHÁT *'),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: const Color(0xFF0B1320),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0x1F00E5FF), width: 0.8),
            ),
            child: DropdownButton<SelfRecordVisibility>(
              value: _selfVisibility,
              isExpanded: true,
              dropdownColor: const Color(0xFF0B1320),
              icon: const Icon(Icons.arrow_drop_down, color: _accent),
              underline: const SizedBox(),
              items: const [
                DropdownMenuItem(
                  value: SelfRecordVisibility.immediate,
                  child: _VisibilityItem(
                    title: 'Phát trực tiếp ngay',
                    subtitle: 'LIVE NOW trên kênh đã chọn',
                    color: _danger,
                  ),
                ),
                DropdownMenuItem(
                  value: SelfRecordVisibility.scheduled,
                  child: _VisibilityItem(
                    title: 'Lưu làm Recording',
                    subtitle: 'Đăng thường, không phát live',
                    color: _accent,
                  ),
                ),
                DropdownMenuItem(
                  value: SelfRecordVisibility.private,
                  child: _VisibilityItem(
                    title: 'Bản nháp (chỉ Staff)',
                    subtitle: 'Không hiển thị với người xem',
                    color: _warn,
                  ),
                ),
              ],
              onChanged: (v) {
                if (v != null) setState(() => _selfVisibility = v);
              },
            ),
          ),

          const SizedBox(height: 16),

          if (_uploading)
            _buildUploadProgress()
          else
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: _accent,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onPressed: _pickedFile == null ? null : _uploadAndBroadcast,
                icon: const Icon(Icons.cloud_upload, size: 18),
                label: Text(
                  _selfVisibility == SelfRecordVisibility.immediate
                      ? 'UPLOAD & PHÁT NGAY'
                      : 'UPLOAD VIDEO',
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.8,
                    fontFamily: 'Outfit',
                  ),
                ),
              ),
            ),
          if (_uploadError != null) ...[
            const SizedBox(height: 8),
            Text(
              _uploadError!,
              style: const TextStyle(color: _danger, fontSize: 12),
            ),
          ],
          const SizedBox(height: 20),
          const _AntiPiracyNote(),
        ],
      ),
    );
  }

  // ─── Tab 3: Catalog (Danh Mục Nguồn Video Công Khai) ──────────
  Widget _buildCatalogTab() {
    return Column(
      children: [
        // Search + verified toggle row
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _catalogSearchCtrl,
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  onChanged: (s) {
                    _catalogSearchDebounce?.cancel();
                    _catalogSearchDebounce = Timer(
                      const Duration(milliseconds: 400),
                      () => _loadCatalog(
                        search: s.trim().isEmpty ? null : s.trim(),
                      ),
                    );
                  },
                  decoration: InputDecoration(
                    hintText: 'Tìm nguồn (HLS, Mux, Cloudinary, 4K...)',
                    hintStyle: const TextStyle(
                      color: Color(0xFF64748B),
                      fontSize: 13,
                    ),
                    prefixIcon: const Icon(Icons.search,
                        color: _accent, size: 20),
                    filled: true,
                    fillColor: const Color(0xFF0B1320),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      vertical: 0,
                      horizontal: 12,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              _VerifiedToggle(
                value: _onlyVerified,
                onChanged: (v) {
                  setState(() => _onlyVerified = v);
                  _loadCatalog();
                },
              ),
            ],
          ),
        ),
        // Summary pills
        if (_catalogSummary != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
            child: Row(
              children: [
                _catalogSummaryPill(
                  icon: Icons.collections_bookmark_rounded,
                  label: '${_catalogSummary!.total} NGUỒN',
                  color: const Color(0xFFF59E0B),
                ),
                const SizedBox(width: 6),
                _catalogSummaryPill(
                  icon: Icons.verified_rounded,
                  label: '${_catalogSummary!.verified} VERIFIED',
                  color: const Color(0xFF22C55E),
                ),
                const SizedBox(width: 6),
                for (final entry in _catalogSummary!.byFormat.entries)
                  Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: _catalogSummaryPill(
                      icon: Icons.movie_creation_outlined,
                      label: '${entry.key} ×${entry.value}',
                      color: _accent,
                    ),
                  ),
              ],
            ),
          ),
        // Body
        Expanded(
          child: _buildCatalogBody(),
        ),
      ],
    );
  }

  Widget _buildCatalogBody() {
    if (_loadingCatalog) {
      return const Padding(
        padding: EdgeInsets.all(40),
        child: Center(child: CircularProgressIndicator(color: _accent)),
      );
    }
    if (_catalogError != null) {
      return Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline,
                color: _danger, size: 40),
            const SizedBox(height: 8),
            Text(
              'Lỗi tải danh mục: $_catalogError',
              textAlign: TextAlign.center,
              style: const TextStyle(color: _danger, fontSize: 12),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _loadCatalog,
              style: ElevatedButton.styleFrom(
                backgroundColor: _accent,
                foregroundColor: Colors.black,
              ),
              child: const Text('Thử lại'),
            ),
          ],
        ),
      );
    }
    if (_catalogStreams.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: const [
              Icon(Icons.collections_bookmark_outlined,
                  color: Color(0xFF475569), size: 48),
              SizedBox(height: 12),
              Text(
                'Không có nguồn nào khớp với kênh hiện tại.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 13,
                ),
              ),
              SizedBox(height: 4),
              Text(
                'Hãy chọn kênh khác hoặc tắt bộ lọc VERIFIED.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Color(0xFF64748B),
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
      );
    }
    return GridView.builder(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 24),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
        childAspectRatio: 0.78,
      ),
      itemCount: _catalogStreams.length,
      itemBuilder: (context, i) {
        final entry = _catalogStreams[i];
        return _CatalogCard(
          entry: entry,
          added: _addedCatalogIds.contains(entry.id),
          onAdd: () => _addFromCatalog(entry),
        );
      },
    );
  }

  Widget _catalogSummaryPill({
    required IconData icon,
    required String label,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: color.withValues(alpha: 0.45),
          width: 0.7,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 10,
              fontWeight: FontWeight.w800,
              fontFamily: 'JetBrainsMono',
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _captureActionButton({
    required IconData icon,
    required String label,
    required String subtitle,
    required Color accent,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFF0B1320),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: accent.withValues(alpha: 0.35),
            width: 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: accent.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: accent, size: 22),
            ),
            const SizedBox(height: 10),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w800,
                fontFamily: 'Outfit',
                fontSize: 13,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPickedFilePreview() {
    final f = _pickedFile!;
    final dur = _pickedFileDurationSec;
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFF0B1320),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0x1F00E5FF), width: 0.8),
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: _accent.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            alignment: Alignment.center,
            child: const Icon(Icons.movie, color: _accent, size: 24),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  f.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  dur != null
                      ? 'Thời lượng: ${_formatDuration(dur)}'
                      : 'Đang đo thời lượng…',
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, color: Color(0xFF94A3B8)),
            onPressed: _uploading
                ? null
                : () {
                    setState(() {
                      _pickedFile = null;
                      _pickedFileDurationSec = null;
                    });
                  },
          ),
        ],
      ),
    );
  }

  Widget _buildUploadProgress() {
    final pct = (_uploadProgress * 100).clamp(0, 100).toInt();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2, color: _accent),
            ),
            const SizedBox(width: 10),
            Text(
              'Đang upload… $pct%',
              style: const TextStyle(color: Colors.white, fontSize: 13),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: _uploadProgress,
            backgroundColor: const Color(0xFF0B1320),
            color: _accent,
            minHeight: 6,
          ),
        ),
      ],
    );
  }

  Widget _fieldLabel(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 6, top: 4),
        child: Text(
          text,
          style: const TextStyle(
            color: _accent,
            fontFamily: 'JetBrainsMono',
            fontSize: 10,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.2,
          ),
        ),
      );

  InputDecoration _inputDecoration({required String hint}) => InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
        filled: true,
        fillColor: const Color(0xFF0B1320),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      );

  String _formatDuration(int seconds) {
    if (seconds <= 0) return '—';
    final h = seconds ~/ 3600;
    final m = (seconds % 3600) ~/ 60;
    final s = seconds % 60;
    if (h > 0) return '${h}h${m.toString().padLeft(2, '0')}';
    if (m > 0) return '${m}p${s.toString().padLeft(2, '0')}';
    return '${s}s';
  }
}

// ============================================================
// Helpers
// ============================================================

class ActiveLiveState {
  final String eventId;
  final String title;
  final int viewerCount;
  final DateTime startedAt;
  ActiveLiveState({
    required this.eventId,
    required this.title,
    required this.viewerCount,
    required this.startedAt,
  });
}

class _VisibilityItem extends StatelessWidget {
  final String title;
  final String subtitle;
  final Color color;
  const _VisibilityItem({
    required this.title,
    required this.subtitle,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Container(
            width: 6,
            height: 24,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(3),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AntiPiracyNote extends StatelessWidget {
  const _AntiPiracyNote();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF0B1320),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: const Color(0xFFF59E0B).withValues(alpha: 0.4),
          width: 0.8,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.shield_outlined, color: Color(0xFFF59E0B), size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Studio chỉ phát nguồn nội bộ hoặc do Studio tự ghi. '
              'Nội dung từ YouTube/Twitch/Vimeo sẽ bị hệ thống chặn tự động để '
              'tuân thủ bản quyền.',
              style: const TextStyle(
                color: Color(0xFFCBD5E1),
                fontSize: 11,
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================
// Catalog tab helpers
// ============================================================

/// Compact verified-only toggle (pill style with green glow when on).
class _VerifiedToggle extends StatelessWidget {
  final bool value;
  final ValueChanged<bool> onChanged;
  const _VerifiedToggle({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onChanged(!value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
        decoration: BoxDecoration(
          color: value
              ? const Color(0xFF22C55E).withValues(alpha: 0.18)
              : const Color(0xFF0B1320),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: value
                ? const Color(0xFF22C55E)
                : const Color(0x1F00E5FF).withValues(alpha: 0.6),
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              value ? Icons.verified_rounded : Icons.verified_outlined,
              size: 18,
              color: value ? const Color(0xFF22C55E) : const Color(0xFF94A3B8),
            ),
            const SizedBox(width: 6),
            Text(
              'VERIFIED',
              style: TextStyle(
                color: value ? const Color(0xFF22C55E) : const Color(0xFF94A3B8),
                fontSize: 10,
                fontWeight: FontWeight.w900,
                fontFamily: 'JetBrainsMono',
                letterSpacing: 1.0,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Grid card for a single catalog stream entry.
/// Shows thumbnail (or placeholder), title, format pill, duration,
/// verified badge and an ADD button.
class _CatalogCard extends StatelessWidget {
  final StudioCatalogStreamModel entry;
  final bool added;
  final VoidCallback onAdd;

  const _CatalogCard({
    required this.entry,
    required this.added,
    required this.onAdd,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0B1320),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: entry.verified
              ? const Color(0xFF22C55E).withValues(alpha: 0.4)
              : const Color(0x1F00E5FF).withValues(alpha: 0.6),
          width: 0.8,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Thumbnail
          AspectRatio(
            aspectRatio: 16 / 9,
            child: Stack(
              fit: StackFit.expand,
              children: [
                _CatalogThumb(entry: entry),
                // Format chip top-left
                Positioned(
                  left: 6,
                  top: 6,
                  child: _formatChip(entry.format),
                ),
                // Verified badge top-right
                if (entry.verified)
                  Positioned(
                    right: 6,
                    top: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 5, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFF22C55E).withValues(alpha: 0.92),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.verified,
                              size: 10, color: Colors.black),
                          SizedBox(width: 2),
                          Text(
                            'CC',
                            style: TextStyle(
                              color: Colors.black,
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                              fontFamily: 'JetBrainsMono',
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                // Duration chip bottom-right
                Positioned(
                  right: 6,
                  bottom: 6,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 5, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.7),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      entry.formattedDuration,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        fontFamily: 'JetBrainsMono',
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Body
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(8, 6, 8, 6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    entry.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      fontFamily: 'Outfit',
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    entry.source,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Color(0xFF94A3B8),
                      fontSize: 9,
                      fontFamily: 'JetBrainsMono',
                    ),
                  ),
                  const Spacer(),
                  SizedBox(
                    width: double.infinity,
                    height: 26,
                    child: ElevatedButton(
                      onPressed: added ? null : onAdd,
                      style: ElevatedButton.styleFrom(
                        backgroundColor:
                            added ? const Color(0xFF1E293B) : _accentCyan,
                        foregroundColor:
                            added ? const Color(0xFF64748B) : Colors.black,
                        padding: EdgeInsets.zero,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            added ? Icons.check_circle : Icons.add_circle,
                            size: 12,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            added ? 'ĐÃ THÊM' : 'THÊM VÀO',
                            style: const TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                              fontFamily: 'JetBrainsMono',
                              letterSpacing: 0.6,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _formatChip(String format) {
    final color = switch (format.toUpperCase()) {
      'HLS' => const Color(0xFFFF6B35),
      'MP4' => const Color(0xFF00E5FF),
      'DASH' => const Color(0xFFA855F7),
      'WEBM' => const Color(0xFF22C55E),
      _ => const Color(0xFF94A3B8),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.6), width: 0.6),
      ),
      child: Text(
        format.toUpperCase(),
        style: TextStyle(
          color: color,
          fontSize: 9,
          fontWeight: FontWeight.w900,
          fontFamily: 'JetBrainsMono',
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}

/// Thumbnail loader with three fallback levels:
///   1. Network image (cached_network_image)
///   2. Colored placeholder with format icon
///   3. Empty dark placeholder
class _CatalogThumb extends StatelessWidget {
  final StudioCatalogStreamModel entry;
  const _CatalogThumb({required this.entry});

  @override
  Widget build(BuildContext context) {
    final url = entry.thumbnailUrl;
    if (url.isEmpty) return _placeholder();
    return CachedNetworkImage(
      imageUrl: url,
      fit: BoxFit.cover,
      placeholder: (_, __) => _placeholder(),
      errorWidget: (_, __, ___) => _placeholder(),
    );
  }

  Widget _placeholder() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF0B1320),
            const Color(0xFF1E293B).withValues(alpha: 0.6),
          ],
        ),
      ),
      alignment: Alignment.center,
      child: Icon(
        switch (entry.format.toUpperCase()) {
          'HLS' => Icons.live_tv,
          'MP4' => Icons.movie,
          'DASH' => Icons.video_settings,
          'WEBM' => Icons.theaters,
          _ => Icons.play_circle_outline,
        },
        size: 28,
        color: const Color(0xFF475569),
      ),
    );
  }
}

/// Inline accent cyan (kept separate so private helper widgets
/// above can compile without importing the State class).
const Color _accentCyan = Color(0xFF00E5FF);