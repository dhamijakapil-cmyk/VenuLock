import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Facebook, Instagram, Twitter, Linkedin } from 'lucide-react';
import { LogoDark } from '@/components/Logo';

const Footer = () => {
  return (
    <footer className="bg-[#111111] text-white noise-overlay">
      <div className="container-main py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <div className="mb-6">
              <LogoDark size="sidebar" linkTo="/" />
            </div>
            <p className="text-slate-400 leading-relaxed mb-6">
              India's trusted venue booking platform. WE TALK. YOU LOCK.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-slate-400 hover:text-[#C8A960] transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-[#C8A960] transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-[#C8A960] transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-[#C8A960] transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-serif text-lg font-semibold mb-6">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/venues" className="text-slate-400 hover:text-white transition-colors">
                  Discover Venues
                </Link>
              </li>
              <li>
                <Link to="/venues?event_type=wedding" className="text-slate-400 hover:text-white transition-colors">
                  Wedding Venues
                </Link>
              </li>
              <li>
                <Link to="/venues?event_type=corporate" className="text-slate-400 hover:text-white transition-colors">
                  Corporate Venues
                </Link>
              </li>
              <li>
                <Link to="/register?role=venue_owner" className="text-slate-400 hover:text-white transition-colors">
                  Partner With Us
                </Link>
              </li>
              <li>
                <Link to="/register?role=event_planner" className="text-slate-400 hover:text-white transition-colors">
                  Explore Event Planning Partners
                </Link>
              </li>
            </ul>
          </div>

          {/* Cities */}
          <div>
            <h4 className="font-serif text-lg font-semibold mb-6">Top Cities</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/venues/delhi" className="text-slate-400 hover:text-white transition-colors">
                  Delhi NCR
                </Link>
              </li>
              <li>
                <Link to="/venues/gurgaon" className="text-slate-400 hover:text-white transition-colors">
                  Gurgaon
                </Link>
              </li>
              <li>
                <Link to="/venues/noida" className="text-slate-400 hover:text-white transition-colors">
                  Noida
                </Link>
              </li>
              <li>
                <Link to="/venues/mumbai" className="text-slate-400 hover:text-white transition-colors">
                  Mumbai (Coming Soon)
                </Link>
              </li>
              <li>
                <Link to="/venues?city=Bangalore" className="text-slate-400 hover:text-white transition-colors">
                  Bangalore (Coming Soon)
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-serif text-lg font-semibold mb-6">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#C8A960] flex-shrink-0 mt-0.5" />
                <span className="text-slate-400">
                  123 Business Tower, Connaught Place, New Delhi - 110001
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#C8A960]" />
                <a href="tel:+911234567890" className="text-slate-400 hover:text-white transition-colors">
                  +91 123 456 7890
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#C8A960]" />
                <a href="mailto:hello@venulock.in" className="text-slate-400 hover:text-white transition-colors">
                  hello@venulock.in
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-sm">
            &copy; {new Date().getFullYear()} VenuLock. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm">
            <Link to="/privacy" className="text-slate-400 hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-slate-400 hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link to="/refund" className="text-slate-400 hover:text-white transition-colors">
              Refund Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
