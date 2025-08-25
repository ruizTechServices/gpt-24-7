'use client'

import { Navbar, NavbarItem, NavbarLabel, NavbarSection, NavbarSpacer } from '@/components/typescript/navbar'
import { Dropdown, DropdownButton, DropdownItem, DropdownMenu } from '@/components/typescript/dropdown'
import Link from 'next/link'

export function LandingNavbar() {
  return (
    <header className="border-b border-zinc-200 dark:border-white/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center">
          {/* Brand */}
          <div className="flex items-center">
            <Link href="/" className="text-lg font-semibold">
              24HourGPT
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="ml-6 hidden sm:flex flex-1 items-center">
            <Navbar className="w-full">
              <NavbarSection>
                <NavbarItem href="/">
                  <NavbarLabel>Home</NavbarLabel>
                </NavbarItem>
                <NavbarItem href="#features">
                  <NavbarLabel>Features</NavbarLabel>
                </NavbarItem>
                <NavbarItem href="#pricing">
                  <NavbarLabel>Pricing</NavbarLabel>
                </NavbarItem>
              </NavbarSection>
              <NavbarSpacer />
              <NavbarSection>
                <NavbarItem href="#contact">
                  <NavbarLabel>Contact</NavbarLabel>
                </NavbarItem>
              </NavbarSection>
            </Navbar>
          </nav>

          {/* Mobile menu */}
          <div className="ml-auto sm:hidden">
            <Dropdown>
              <DropdownButton>Menu</DropdownButton>
              <DropdownMenu anchor="bottom end">
                <DropdownItem href="/">Home</DropdownItem>
                <DropdownItem href="#features">Features</DropdownItem>
                <DropdownItem href="#pricing">Pricing</DropdownItem>
                <DropdownItem href="#contact">Contact</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
      </div>
    </header>
  )
}
