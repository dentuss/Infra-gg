# PRODUCT.md

# Rainbow Six Siege Team Platform

## Vision

The goal is to create the ultimate collaboration platform for competitive Rainbow Six Siege teams.

Instead of using Discord, Google Docs, Google Slides, Dropbox and spreadsheets separately, the team should manage everything inside a single application.

The application should feel like software specifically built for professional Siege teams.

---

# Target Audience

- Competitive Teams
- Coaches
- Analysts
- IGLs
- Team Managers

This is NOT a public strategy website.

It is a private workspace.

---

# Core Modules

The platform consists of five major modules.

1. Dashboard

2. Calendar

3. Documents

4. Strategy Builder

5. Team Management

Future modules may include

- VOD Review
- Statistics
- AI Analysis

---

# Product Principles

The application should always be

- Fast
- Minimal
- Professional
- Easy to learn
- Keyboard friendly
- Responsive

Avoid unnecessary complexity.

---

# Authentication

Users must log in.

Only invited users can join a workspace.

Every user belongs to a team.

Roles determine permissions.

Example

Coach

IGL

Analyst

Player

Manager

---

# Dashboard

The dashboard provides quick access to

Upcoming Practices

Upcoming Matches

Recent Strategies

Recent Documents

Notifications

Recent Team Activity

---

# Calendar

Supports

Practices

Scrims

Official Matches

Meetings

Reminders

Recurring Events

---

# Documents

Rich text editor.

Supports

Images

Tables

Code Blocks

Lists

Checklists

Mentions

Search

Folders

---

# Strategy Builder

The Strategy Builder is the most important feature in the application.

It should NOT behave like Miro.

It should NOT use an infinite canvas.

Instead, it should behave similarly to Google Slides.

Each strategy consists of one or more pages.

Each page has a fixed size.

The blueprint acts as the background of the page.

All objects are placed on top of the blueprint.

This provides consistency between strategies.

---

# Strategy Structure

Workspace

└── Strategy

        ├── Page 1
        ├── Page 2
        ├── Page 3

Each page represents one situation.

Examples

Round Start

Drone Phase

Execute

Post Plant

Retake

---

# Maps

The application includes every ranked map.

Example

Bank

Clubhouse

Consulate

Chalet

Border

Kafe

Skyscraper

...

Selecting a map automatically loads the correct blueprint.

The user chooses

Map

↓

Floor

↓

Site

Blueprint is automatically displayed.

---

# Canvas

The canvas has fixed dimensions.

Example

1920 × 1080

or

16:9

The blueprint fills the entire page.

Users cannot infinitely scroll.

Zoom is allowed.

Pan is limited to the page.

---

# Blueprint

The blueprint is always the background layer.

It cannot accidentally move.

It can optionally be replaced with another blueprint version.

Examples

Clean Blueprint

Callout Blueprint

Colored Blueprint

Night Mode

---

# Objects

Objects can be placed on top of the blueprint.

Supported objects

Operators

Text

Arrows

Lines

Rectangles

Circles

Smoke

Flash

Frag

Drone

Claymore

Airjab

Camera

Shield

Bomb

Breach Charges

Custom Icons

Images

---

# Operators

Every operator has an icon.

Operators support

Move

Rotate

Duplicate

Delete

Flip

Opacity

Labels

Example

Ash

Thermite

Smoke

Mute

Azami

---

# Utility

Utility icons can be dragged onto the blueprint.

Examples

ADS

Magnet

Mute Jammer

Evil Eye

Banshee

Camera

Drone

Nitro

Smoke Grenade

Flash

EMP

Airjab

Selma

---

# Drawing Tools

Arrow

Line

Rectangle

Circle

Polygon

Freehand

Text

Measurements

---

# Editing

Undo

Redo

Copy

Paste

Duplicate

Delete

Snap to Grid

Align

Bring Forward

Send Backward

Group

Ungroup

Lock

Hide

---

# Layers

Objects exist on layers.

Users can

Lock

Hide

Rename

Reorder

---

# Multi Page Strategies

A strategy can contain unlimited pages.

Example

Page 1

Preparation Phase

↓

Page 2

Default Setup

↓

Page 3

Mid Round

↓

Page 4

Execute

↓

Page 5

Post Plant

Pages can be duplicated.

Pages can be reordered.

---

# Saving

Strategies save automatically.

Every save creates a version.

Users can restore previous versions.

---

# Export

PNG

PDF

JSON

Future

Share Link

---

# Collaboration

Multiple users can edit the same strategy.

Changes appear in real time.

Presence indicators show who is editing.

Comments can be attached to any object.

---

# Team Management

Manage

Players

Roles

Permissions

Invites

Activity

---

# Search

Global search should find

Strategies

Documents

Players

Events

Maps

Operators

---

# Notifications

Discord

Email

In-App

---

# Performance Goals

Initial page load

<2 seconds

Strategy loading

<1 second

Autosave

<500 ms

Real-time updates

Near instant

---

# Design Language

Dark theme

Minimal UI

Professional

Inspired by

Google Slides

Notion

Discord

R6 Tracker

The interface should disappear behind the content.

The strategy itself should always be the primary focus.

---

# Long-Term Vision

The application should become the operating system for a competitive Rainbow Six Siege team.

A coach should be able to run an entire season without opening any external productivity software.
