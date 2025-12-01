import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { MapPin, Phone, Mail } from "lucide-react"
import { TerminalText } from "@/components/terminal-text"

export default function Home() {
  return (
    <div className="min-h-screen bg-white overflow-hidden relative">
      {/* We're Hiring. Send us your CV to info@aibos.com */}

      {/* Tech-themed background elements - keeping only the largest blur in top right */}
      <div className="absolute top-20 right-40 w-80 h-80 rounded-full bg-aibos-blue/10 opacity-50 blur-3xl"></div>
      <div className="absolute top-40 left-20 w-80 h-80 rounded-full bg-sky-100 opacity-40 blur-3xl"></div>

      {/* Grid pattern in the background */}
      <div
        className="absolute top-0 left-0 w-full h-full"
        style={{
          backgroundImage: "radial-gradient(circle, #e0e7ff 1px, transparent 1px)",
          backgroundSize: "30px 30px",
          opacity: 0.3,
        }}
      ></div>

      {/* Decorative circles */}
      <div className="absolute top-40 right-1/4 w-6 h-6 rounded-full bg-aibos-blue/30 opacity-20"></div>
      <div className="absolute top-60 left-1/4 w-4 h-4 rounded-full bg-blue-500 opacity-30"></div>
      <div className="absolute top-80 right-1/3 w-8 h-8 rounded-full bg-sky-300 opacity-20"></div>

      {/* Concentric circles */}
      <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-blue-100 opacity-40"></div>
      <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-blue-100 opacity-40"></div>
      <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-blue-100 opacity-40"></div>

      <div className="container mx-auto px-4 py-4 relative z-10">
        <header className="flex justify-between items-center mb-8 mt-2">
          <div className="flex items-center">
            <Image src="/aibos-logo.png" alt="AIBOS Logo" width={80} height={80} className="object-contain" />
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link href="#" className="text-sm text-gray-600 hover:text-aibos-blue transition-colors">
              About
            </Link>
            <Link href="/jobs" className="text-sm text-gray-600 hover:text-aibos-blue transition-colors">
              Careers
            </Link>
            <Link href="#" className="text-sm text-gray-600 hover:text-aibos-blue transition-colors">
              Contact
            </Link>
            <Link href="/interview/demo">
              <Button
                variant="outline"
                className="text-sm border-aibos-blue text-aibos-blue hover:bg-blue-50/80 bg-transparent"
              >
                Try AI Interview
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button
                className="text-sm bg-aibos-blue hover:bg-aibos-darkBlue text-white"
              >
                Apply Now
              </Button>
            </Link>
          </div>
        </header>

        <main>
          <section className="py-12 md:py-20">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-5 relative">
                {/* Terminal-like typing animation for console.log - no enclosure */}
                <div className="w-fit">
                  <TerminalText text={`console.log("We're Hiring!");`} typingSpeed={80} resetInterval={5000} />
                </div>

                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-mono text-gray-900 leading-tight">
                  Join Our <span className="text-aibos-blue">Team</span>
                </h1>

                {/* Just changing the font to monospace without additional styling */}
                <p className="font-mono text-sm text-gray-600 max-w-lg">
                  Well-capitalized tech company seeks talented developers to help pioneer next-generation software
                  solutions. You must be able to build complex yet maintainable systems in one-third the time most
                  people think possible.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/jobs">
                    <Button size="default" className="bg-aibos-blue hover:bg-aibos-darkBlue text-white">
                      View Open Positions
                    </Button>
                  </Link>
                  <Link href="#">
                    <Button
                      size="default"
                      variant="outline"
                      className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
                    >
                      Learn More
                    </Button>
                  </Link>
                </div>
              </div>
              {/* Card with gradient border */}
              <div className="relative">
                {/* Simplified background */}
                <div className="absolute -z-10 inset-0 bg-gradient-to-br from-white to-blue-50/30 rounded-2xl"></div>

                <div className="p-8 rounded-2xl border border-gray-100">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <div className="text-4xl font-bold text-aibos-blue/30 leading-none mb-2">12</div>
                      <div className="w-12 h-0.5 bg-aibos-blue mb-1"></div>
                      <div className="w-8 h-0.5 bg-aibos-blue/50"></div>
                    </div>
                    <div className="text-right">
                      <h2 className="text-2xl font-bold text-gray-800">Open Positions</h2>
                      <p className="text-sm text-gray-600 font-mono">Available Now</p>
                    </div>
                  </div>

                  {/* Position list with clean typography */}
                  <div className="space-y-6 mb-8">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <div>
                        <h4 className="font-medium text-gray-800">Software Development Engineer II</h4>
                        <p className="text-xs text-gray-500 font-mono">Platform Team • Kampala</p>
                      </div>
                      <span className="text-aibos-blue font-bold">5</span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <div>
                        <h4 className="font-medium text-gray-800">Principal Research Scientist</h4>
                        <p className="text-xs text-gray-500 font-mono">AI Research • Kyoto</p>
                      </div>
                      <span className="text-aibos-blue font-bold">3</span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <div>
                        <h4 className="font-medium text-gray-800">Data Engineer II</h4>
                        <p className="text-xs text-gray-500 font-mono">Data Team • Kampala</p>
                      </div>
                      <span className="text-aibos-blue font-bold">2</span>
                    </div>

                    <div className="flex justify-between items-center py-2">
                      <div>
                        <h4 className="font-medium text-gray-800">Senior UX Designer</h4>
                        <p className="text-xs text-gray-500 font-mono">Product Team • Kyoto</p>
                      </div>
                      <span className="text-aibos-blue font-bold">2</span>
                    </div>
                  </div>

                  <Link
                    href="/jobs"
                    className="block text-center text-aibos-blue hover:text-aibos-darkBlue font-medium transition-colors"
                  >
                    View All Positions →
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <section className="py-16 bg-white relative overflow-hidden">
            {/* Minimal background elements */}
            <div className="absolute top-20 right-20 w-32 h-32 bg-aibos-blue/5 rounded-full opacity-40"></div>
            <div className="absolute bottom-20 left-20 w-40 h-40 bg-sky-50 rounded-full opacity-40"></div>

            <div className="container mx-auto px-4 relative z-10">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">Why Join Our Team</h2>
                <p className="text-gray-600 max-w-2xl mx-auto font-mono text-sm">
                  Expect talented, motivated, intense, and interesting co-workers. We're building cutting-edge solutions
                  and need exceptional people to make it happen.
                </p>
              </div>

              <div className="max-w-5xl mx-auto">
                {/* First item */}
                <div className="flex items-start gap-8 mb-16">
                  <div className="flex-shrink-0">
                    <div className="text-6xl font-bold text-aibos-blue/20 leading-none">01</div>
                    <div className="w-16 h-0.5 bg-aibos-blue mt-2"></div>
                    <div className="w-12 h-0.5 bg-aibos-blue/50 mt-1"></div>
                  </div>
                  <div className="pt-4">
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">Simple Process</h3>
                    <p className="text-gray-600 font-mono text-sm leading-relaxed">
                      Our application process is straightforward and user-friendly. No account creation required. Just
                      submit your information and we'll take care of the rest.
                    </p>
                  </div>
                </div>

                {/* Second item */}
                <div className="flex items-start gap-8 mb-16">
                  <div className="flex-shrink-0">
                    <div className="text-6xl font-bold text-aibos-blue/20 leading-none">02</div>
                    <div className="w-16 h-0.5 bg-aibos-blue mt-2"></div>
                    <div className="w-12 h-0.5 bg-aibos-blue/50 mt-1"></div>
                  </div>
                  <div className="pt-4">
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">Secure Submission</h3>
                    <p className="text-gray-600 font-mono text-sm leading-relaxed">
                      Your information is encrypted and securely stored. We value your privacy and data security above
                      all else, ensuring your personal details remain protected.
                    </p>
                  </div>
                </div>

                {/* Third item */}
                <div className="flex items-start gap-8">
                  <div className="flex-shrink-0">
                    <div className="text-6xl font-bold text-aibos-blue/20 leading-none">03</div>
                    <div className="w-16 h-0.5 bg-aibos-blue mt-2"></div>
                    <div className="w-12 h-0.5 bg-aibos-blue/50 mt-1"></div>
                  </div>
                  <div className="pt-4">
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">Fast Response</h3>
                    <p className="text-gray-600 font-mono text-sm leading-relaxed">
                      Our team reviews applications promptly. You'll hear back from us within 5 business days with next
                      steps or feedback on your application.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="py-12 text-center relative">
            {/* Tech-themed design elements */}
            {/* Contained tech elements */}
            <div className="absolute top-10 left-10 w-16 h-16 bg-blue-50/80 rounded-full opacity-40"></div>
            <div className="absolute bottom-10 right-10 w-20 h-20 bg-sky-50 rounded-full opacity-40"></div>

            {/* Floating tech elements */}
            {/* Floating tech elements */}

            <div className="max-w-3xl mx-auto relative z-10">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Ready to Join Our Team?</h2>
              <p className="text-sm text-gray-600 mb-6">
                Top-notch communication skills are essential. Take the first step towards an exciting career building
                innovative solutions.
              </p>
              <Link href="/sign-in">
                <Button className="bg-aibos-blue hover:bg-aibos-darkBlue text-white px-6">
                  Start Your Application
                </Button>
              </Link>
            </div>
          </section>
        </main>

        <footer className="mt-20 border-t border-gray-200 pt-8 pb-12 relative">
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-50/80 rounded-full opacity-30 transform translate-x-1/3 translate-y-1/3"></div>

          <div className="container mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              {/* Company Info */}
              <div>
                <div className="flex items-center mb-4">
                  <Image src="/aibos-logo.png" alt="AIBOS Logo" width={100} height={100} className="object-contain" />
                </div>
                <p className="text-xs text-gray-600 mb-4">
                  Building cutting-edge software solutions with exceptional talent.
                </p>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 text-aibos-blue mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-600 text-xs">
                      Level 7, Arie Towers, 16 Mackinnon Rd,
                      <br />
                      Nakasero - Kampala
                    </p>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 text-aibos-blue mr-2 flex-shrink-0" />
                    <p className="text-gray-600 text-xs">+256 700 123 456</p>
                  </div>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-aibos-blue mr-2 flex-shrink-0" />
                    <p className="text-gray-600 text-xs">info@aibos.com</p>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h3 className="font-bold text-gray-800 text-sm mb-3">Quick Links</h3>
                <ul className="space-y-2">
                  <li>
                    <Link href="#" className="text-gray-600 hover:text-aibos-blue transition-colors text-xs">
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-gray-600 hover:text-aibos-blue transition-colors text-xs">
                      Careers
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-gray-600 hover:text-aibos-blue transition-colors text-xs">
                      Services
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-gray-600 hover:text-aibos-blue transition-colors text-xs">
                      Projects
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-gray-600 hover:text-aibos-blue transition-colors text-xs">
                      Contact
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h3 className="font-bold text-gray-800 text-sm mb-3">Legal</h3>
                <ul className="space-y-2">
                  <li>
                    <Link href="#" className="text-gray-600 hover:text-aibos-blue transition-colors text-xs">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-gray-600 hover:text-aibos-blue transition-colors text-xs">
                      Terms of Service
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-gray-600 hover:text-aibos-blue transition-colors text-xs">
                      Cookie Policy
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 text-center">
              <p className="text-gray-500 text-xs">© {new Date().getFullYear()} AIBOS. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
      <div className="absolute top-1/3 right-20 w-12 h-12 bg-aibos-blue/20 rounded-md opacity-40 transform rotate-45"></div>
      <div className="absolute bottom-1/4 left-20 w-16 h-16 bg-sky-200 rounded-md opacity-40 transform -rotate-12"></div>
      <div className="absolute top-1/4 left-1/3 w-8 h-8 bg-aibos-blue/20 rounded-full opacity-40"></div>
      <div className="absolute top-40 right-40 w-6 h-6 rounded-md bg-aibos-blue/30 opacity-40 transform rotate-12"></div>
      <div className="absolute bottom-0 left-0 w-60 h-60 bg-sky-50 rounded-full opacity-50 transform -translate-x-1/2 translate-y-1/2"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border-2 border-blue-100 opacity-30"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border-2 border-blue-100 opacity-30"></div>
    </div>
  )
}

// We're Hiring. Send us your CV to info@aibos.com
