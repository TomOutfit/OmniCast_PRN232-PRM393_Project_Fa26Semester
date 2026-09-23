import Link from 'next/link';
import { Tv, Github, Twitter, Facebook, Mail, Phone } from 'lucide-react';

const footerLinks = {
  product: [
    { name: 'Tính năng', href: '/features' },
    { name: 'Lịch phát sóng', href: '/epg' },
    { name: 'Kênh', href: '/channels' },
    { name: 'Giá cả', href: '/pricing' },
  ],
  company: [
    { name: 'Giới thiệu', href: '/about' },
    { name: 'Blog', href: '/blog' },
    { name: 'Tuyển dụng', href: '/careers' },
    { name: 'Liên hệ', href: '/contact' },
  ],
  legal: [
    { name: 'Điều khoản sử dụng', href: '/terms' },
    { name: 'Chính sách bảo mật', href: '/privacy' },
    { name: 'Chính sách bản quyền', href: '/copyright' },
  ],
};

export function Footer() {
  return (
    <footer className="bg-dark-900 border-t border-dark-800">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-accent-cyan flex items-center justify-center">
                <Tv className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">OmniCast</span>
            </Link>
            <p className="text-dark-400 text-sm mb-4">
              Hệ thống quản lý lịch phát sóng EPG thông minh và nền tảng
              truyền thông doanh nghiệp hàng đầu.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="text-dark-500 hover:text-primary-400 transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="text-dark-500 hover:text-primary-400 transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="text-dark-500 hover:text-primary-400 transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Sản phẩm</h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-dark-400 text-sm hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Công ty</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-dark-400 text-sm hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Pháp lý</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-dark-400 text-sm hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Liên hệ</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-dark-400 text-sm">
                <Mail className="w-4 h-4" />
                contact@omnicast.tv
              </li>
              <li className="flex items-center gap-2 text-dark-400 text-sm">
                <Phone className="w-4 h-4" />
                +84 123 456 789
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-dark-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-dark-500 text-sm">
            © 2026 OmniCast. Bảo lưu mọi quyền.
          </p>
          <p className="text-dark-500 text-sm">
            Được phát triển bởi nhóm PRN232 & PRM393
          </p>
        </div>
      </div>
    </footer>
  );
}
