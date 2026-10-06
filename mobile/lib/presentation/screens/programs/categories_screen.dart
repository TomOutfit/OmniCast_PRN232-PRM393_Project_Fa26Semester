// OmniCast - Categories Browse Screen
// Landing screen for browsing all program categories with Cyber-Dark styling.
// Categories loaded dynamically from backend API.

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../logic/channels/channels_bloc.dart';
import '../../../core/utils/category_utils.dart';

class CategoriesScreen extends StatefulWidget {
  const CategoriesScreen({super.key});

  @override
  State<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends State<CategoriesScreen> {
  @override
  void initState() {
    super.initState();
    context.read<ChannelsBloc>().add(const LoadCategories());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF070B12),
      appBar: AppBar(
        backgroundColor: const Color(0xFF090F1A),
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          '19 Chuyên Mục Nội Dung',
          style: TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.3,
          ),
        ),
      ),
      body: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            sliver: SliverToBoxAdapter(
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFF090F1A),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFF162338)),
                ),
                child: const Row(
                  children: [
                    Icon(
                      Icons.hub_rounded,
                      color: Color(0xFF00E5FF),
                      size: 20,
                    ),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Kho chương trình độc quyền phát sóng 24/7 từ 12 nguồn tin cậy — Thể thao, Thời sự, Điện ảnh, Esports, AI Tech…',
                        style: TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 12,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            sliver: BlocBuilder<ChannelsBloc, ChannelsState>(
              builder: (context, state) {
                if (state is ChannelsLoading) {
                  return const SliverToBoxAdapter(
                    child: Center(
                      child: CircularProgressIndicator(color: Color(0xFF00E5FF)),
                    ),
                  );
                }
                if (state is CategoriesLoaded) {
                  return SliverGrid(
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1.35,
                    ),
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final cat = state.categories[index];
                        final info = getCategoryInfo(cat.category);
                        return _CategoryTile(
                          value: cat.category,
                          label: info.label,
                          icon: info.icon,
                          color: info.color,
                          count: cat.count,
                        );
                      },
                      childCount: state.categories.length,
                    ),
                  );
                }
                return const SliverToBoxAdapter(
                  child: Center(
                    child: Text('Không thể tải danh mục'),
                  ),
                );
              },
            ),
          ),
          const SliverToBoxAdapter(
            child: SizedBox(height: 32),
          ),
        ],
      ),
    );
  }
}

class _CategoryTile extends StatelessWidget {
  final String value;
  final String label;
  final IconData icon;
  final Color color;
  final int count;

  const _CategoryTile({
    required this.value,
    required this.label,
    required this.icon,
    required this.color,
    required this.count,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () =>
            context.push('/category/${Uri.encodeComponent(value)}'),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFF0B1320),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                color.withValues(alpha: 0.25),
                const Color(0xFF0B1320),
              ],
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: color.withValues(alpha: 0.35),
              width: 1,
            ),
            boxShadow: const [
              BoxShadow(
                color: Color(0x33000000),
                blurRadius: 8,
                offset: Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: const Color(0xFF070B12),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: color.withValues(alpha: 0.3),
                  ),
                ),
                child: Icon(
                  icon,
                  color: color,
                  size: 20,
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Text(
                        'Xem kênh & VOD',
                        style: TextStyle(
                          color: color,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Icon(
                        Icons.arrow_forward_rounded,
                        size: 10,
                        color: color,
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}