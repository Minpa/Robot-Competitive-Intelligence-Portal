# Implementation Plan: Robot Competitive Intelligence Portal

## Overview

This implementation plan breaks down the Robot Competitive Intelligence Portal into discrete coding tasks. The system will be built using TypeScript/Node.js with FastAPI-style backend (NestJS), React frontend, PostgreSQL for relational data, Elasticsearch for search, and Python for the NLP engine.

## Tasks

- [x] 1. Project Setup and Infrastructure
  - [x] 1.1 Initialize monorepo structure with packages for backend, crawler, nlp-engine, and frontend
    - Create package.json with workspaces configuration
    - Set up TypeScript configuration for each package
    - Configure ESLint and Prettier
    - _Requirements: 10.1-10.6_
  
  - [x] 1.2 Set up database schemas and migrations
    - Create PostgreSQL schema with all entity tables (Company, Product, ProductSpec, Article, Keyword, KeywordStats, CrawlTarget, CrawlJob, CrawlError, User, AuditLog)
    - Set up foreign key relationships and indexes
    - Create migration scripts
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  
  - [x] 1.3 Configure Elasticsearch indices
    - Create index mappings for companies, products, and articles
    - Configure analyzers for Korean and English text
    - Set up index aliases for zero-downtime reindexing
    - _Requirements: 8.1_

- [x] 2. Core Data Models and Services
  - [x] 2.1 Implement entity models and DTOs
    - Create TypeScript interfaces for all entities
    - Implement validation decorators using class-validator
    - Create DTOs for create/update operations
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  
  - [ ]* 2.2 Write property test for entity field completeness
    - **Property 20: Entity Field Completeness**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6**
  
  - [x] 2.3 Implement CompanyService with CRUD operations
    - Create, read, update, delete company entities
    - Implement list with filtering and pagination
    - Add search functionality
    - _Requirements: 2.2, 10.1_
  
  - [x] 2.4 Implement ProductService with CRUD operations
    - Create, read, update, delete product entities
    - Enforce company association (foreign key)
    - Implement category validation
    - _Requirements: 2.1, 2.3, 2.6, 10.2_
  
  - [ ]* 2.5 Write property tests for entity hierarchy and category validation
    - **Property 6: Entity Hierarchy Integrity**
    - **Property 7: Product Category Validation**
    - **Validates: Requirements 2.1, 2.3, 2.6**
  
  - [x] 2.6 Implement ProductSpecService
    - Create and update product specifications
    - Handle JSON sensor data storage
    - _Requirements: 2.4, 10.3_
  
  - [x] 2.7 Implement ArticleService with CRUD operations
    - Create, read, update, delete article entities
    - Associate articles with companies and products
    - Implement timeline queries
    - _Requirements: 2.5, 10.4_

- [x] 3. Checkpoint - Core Data Layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Deduplication and Content Hashing
  - [x] 4.1 Implement DeduplicationService
    - Create content hash generation using SHA-256
    - Implement duplicate checking against database
    - Add content registration with metadata
    - _Requirements: 1.2, 1.3_
  
  - [ ]* 4.2 Write property tests for content hashing
    - **Property 1: Content Hash Consistency**
    - **Property 2: Duplicate Detection Prevents Storage**
    - **Validates: Requirements 1.2, 1.3**
  
  - [x] 4.3 Implement article storage with deduplication
    - Integrate deduplication check before article creation
    - Return existing article if duplicate detected
    - Log duplicate detections
    - _Requirements: 1.3, 1.4_
  
  - [ ]* 4.4 Write property test for storage round-trip
    - **Property 3: Unique Content Storage Round-Trip**
    - **Validates: Requirements 1.4**

- [x] 5. Crawler Microservice
  - [x] 5.1 Implement CrawlerService core
    - Create HTTP client with configurable timeouts
    - Implement rate limiting per domain
    - Add retry logic with exponential backoff
    - _Requirements: 1.1, 1.6_
  
  - [x] 5.2 Implement content parser
    - Create configurable CSS selector-based extraction
    - Support multiple content types (product pages, articles, specs)
    - Handle parsing errors gracefully
    - _Requirements: 1.1, 8.2_
  
  - [x] 5.3 Implement crawl job execution
    - Process multiple URLs in a single job
    - Track success/failure/duplicate counts
    - Continue processing on individual URL failures
    - _Requirements: 1.1, 1.6, 8.3_
  
  - [ ]* 5.4 Write property test for crawl job resilience
    - **Property 4: Crawl Job Resilience**
    - **Validates: Requirements 1.6, 8.2, 8.3**
  
  - [x] 5.5 Implement SchedulerService
    - Create cron-based job scheduling
    - Support configurable frequency per target
    - Track last-crawled timestamps
    - _Requirements: 1.5, 1.7_
  
  - [ ]* 5.6 Write property test for timestamp tracking
    - **Property 5: Incremental Crawl Timestamp Tracking**
    - **Validates: Requirements 1.7**
  
  - [x] 5.7 Implement error logging for crawler
    - Log all crawl errors with URL, type, message, timestamp
    - Store errors in database for admin monitoring
    - _Requirements: 7.3, 8.2_
  
  - [ ]* 5.8 Write property test for error logging completeness
    - **Property 17: Error Logging Completeness**
    - **Validates: Requirements 7.3**

- [x] 6. Checkpoint - Crawler Service
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. NLP Engine (Python)
  - [x] 7.1 Set up Python NLP service
    - Create FastAPI service for keyword extraction
    - Install Korean (KoNLPy/Mecab) and English (spaCy) tokenizers
    - Configure service endpoints
    - _Requirements: 3.1, 3.2_
  
  - [x] 7.2 Implement KeywordExtractionService
    - Implement language detection
    - Extract keywords using TF-IDF and named entity recognition
    - Return keywords with relevance scores
    - _Requirements: 3.1, 3.2_
  
  - [ ]* 7.3 Write property test for keyword extraction coverage
    - **Property 8: Keyword Extraction Coverage**
    - **Validates: Requirements 3.1, 3.2**
  
  - [x] 7.4 Implement TrendAnalysisService
    - Calculate weekly and monthly keyword frequencies
    - Compute delta and delta percent between periods
    - Associate keywords with companies and products
    - _Requirements: 3.3, 3.4, 3.5, 3.6_
  
  - [ ]* 7.5 Write property test for delta calculation
    - **Property 9: Keyword Stats Delta Calculation**
    - **Validates: Requirements 3.5**
  
  - [x] 7.6 Implement keyword storage and association
    - Store extracted keywords in database
    - Create keyword-article and keyword-product associations
    - Update keyword statistics on new article ingestion
    - _Requirements: 3.6, 10.5, 10.6_

- [ ] 8. Checkpoint - NLP Engine
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Search and Filter Services
  - [x] 9.1 Implement SearchService with Elasticsearch
    - Create global search across companies, products, articles
    - Implement entity-specific search endpoints
    - Add autocomplete suggestions
    - _Requirements: 8.1_
  
  - [x] 9.2 Implement filtering logic
    - Support all filter types: company, category, year, price, specs, keywords, country
    - Combine multiple filters with AND logic
    - Optimize queries for performance
    - _Requirements: 4.4_
  
  - [ ]* 9.3 Write property test for filter correctness
    - **Property 11: Filter Results Correctness**
    - **Validates: Requirements 4.4**
  
  - [x] 9.4 Implement sorting logic
    - Support sort by: latest update, release date, article count, interest level
    - Handle ascending and descending order
    - _Requirements: 4.5_
  
  - [ ]* 9.5 Write property test for sort order correctness
    - **Property 12: Sort Order Correctness**
    - **Validates: Requirements 4.5**
  
  - [x] 9.6 Implement product detail aggregation
    - Aggregate product overview, specs, pricing, articles, keywords
    - Return complete detail view data
    - _Requirements: 4.3_
  
  - [ ]* 9.7 Write property test for product detail completeness
    - **Property 10: Product Detail Data Completeness**
    - **Validates: Requirements 4.3**

- [ ] 10. Checkpoint - Search Services
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Dashboard and Timeline Services
  - [x] 11.1 Implement DashboardService
    - Create dashboard summary endpoint
    - Aggregate total counts and weekly metrics
    - _Requirements: 5.1_
  
  - [x] 11.2 Implement timeline data generation
    - Query articles and products by date range
    - Group by day/week for timeline display
    - _Requirements: 5.1_
  
  - [ ]* 11.3 Write property test for timeline period correctness
    - **Property 13: Timeline Period Correctness**
    - **Validates: Requirements 5.1**
  
  - [x] 11.4 Implement weekly highlights
    - Identify new products from current week
    - Detect price changes
    - Find PR/article peaks
    - Get trending keywords
    - _Requirements: 5.3_
  
  - [ ]* 11.5 Write property test for highlights recency
    - **Property 14: Weekly Highlights Recency**
    - **Validates: Requirements 5.3**
  
  - [x] 11.6 Implement chart data generation
    - Generate data for line, bar, pie charts
    - Support multiple time periods
    - _Requirements: 5.2_

- [x] 12. Export Services
  - [x] 12.1 Implement CSV export
    - Export filtered data to CSV format
    - Include all relevant columns
    - _Requirements: 6.1_
  
  - [x] 12.2 Implement Excel export
    - Export filtered data to XLSX format
    - Support multiple sheets for different entity types
    - _Requirements: 6.1_
  
  - [x] 12.3 Implement filtered export logic
    - Apply current filters to export data
    - Ensure export matches list view
    - _Requirements: 6.4_
  
  - [ ]* 12.4 Write property test for export filter consistency
    - **Property 15: Export Data Filter Consistency**
    - **Validates: Requirements 6.4**
  
  - [x] 12.5 Implement report generation
    - Create print-friendly HTML/PDF reports
    - Support dark and light themes
    - _Requirements: 6.2, 6.3, 6.5_

- [ ] 13. Checkpoint - Dashboard and Export
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Admin Services
  - [x] 14.1 Implement AdminCrawlerService
    - CRUD operations for crawl targets
    - Manage crawl patterns per target
    - _Requirements: 7.1_
  
  - [x] 14.2 Implement rate limit configuration
    - Store and retrieve rate limit settings per target
    - Apply rate limits during crawling
    - _Requirements: 7.2_
  
  - [ ]* 14.3 Write property test for rate limit persistence
    - **Property 16: Rate Limit Configuration Persistence**
    - **Validates: Requirements 7.2**
  
  - [x] 14.4 Implement manual crawl trigger
    - Create endpoint to trigger immediate crawl
    - Create job for specified targets
    - _Requirements: 7.4_
  
  - [ ]* 14.5 Write property test for manual trigger job creation
    - **Property 18: Manual Trigger Job Creation**
    - **Validates: Requirements 7.4**
  
  - [x] 14.6 Implement crawl error monitoring
    - List crawl errors with filtering
    - Display error statistics
    - _Requirements: 7.3_

- [x] 15. Authentication and Authorization
  - [x] 15.1 Implement AuthService
    - JWT-based authentication
    - Login, logout, token refresh
    - _Requirements: 9.2_
  
  - [x] 15.2 Implement role-based access control
    - Define roles: admin, analyst, viewer
    - Create permission guards for endpoints
    - _Requirements: 9.1, 9.3_
  
  - [ ]* 15.3 Write property test for RBAC enforcement
    - **Property 19: Role-Based Access Control**
    - **Validates: Requirements 7.5, 9.1, 9.3**
  
  - [x] 15.4 Implement audit logging
    - Log admin actions with user, action, entity details
    - Store access denial attempts
    - _Requirements: 9.3_

- [ ] 16. Checkpoint - Admin and Auth
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Frontend - Core Structure
  - [x] 17.1 Initialize React application
    - Set up Next.js with TypeScript
    - Configure routing structure
    - Set up state management (React Query)
    - _Requirements: 4.1_
  
  - [x] 17.2 Implement API client
    - Create typed API client for all backend endpoints
    - Handle authentication tokens
    - Implement error handling
    - _Requirements: 4.1_
  
  - [x] 17.3 Implement layout and navigation
    - Create main layout with sidebar navigation
    - Implement responsive design
    - Add dark/light theme toggle
    - _Requirements: 5.5_

- [x] 18. Frontend - List and Detail Views
  - [x] 18.1 Implement company list and detail pages
    - Board-style list view with filtering
    - Detail page with products and articles
    - _Requirements: 4.1, 4.2_
  
  - [x] 18.2 Implement product list and detail pages
    - List view with spec filters
    - Detail page with specs, articles, keywords, timeline
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [x] 18.3 Implement article list and detail pages
    - List view with date and source filters
    - Detail page with full content and related entities
    - _Requirements: 4.1, 4.2_
  
  - [x] 18.4 Implement filter and sort controls
    - Filter panel with all filter types
    - Sort dropdown with all sort options
    - _Requirements: 4.4, 4.5_

- [x] 19. Frontend - Dashboard
  - [x] 19.1 Implement dashboard page
    - Summary cards with key metrics
    - Weekly highlights section
    - _Requirements: 5.1, 5.3_
  
  - [x] 19.2 Implement chart components
    - Line charts for trends
    - Bar charts for comparisons
    - Integrate charting library (Chart.js or Recharts)
    - _Requirements: 5.2_
  
  - [x] 19.3 Implement timeline view
    - Chronological display of events
    - Filter by entity type
    - _Requirements: 5.1_

- [x] 20. Frontend - Export and Admin
  - [x] 20.1 Implement export functionality
    - Export buttons on list views
    - CSV and Excel download
    - _Requirements: 6.1, 6.4_
  
  - [x] 20.2 Implement print-friendly report view
    - Report layout component
    - Print styles
    - _Requirements: 6.3_
  
  - [x] 20.3 Implement admin panel
    - Crawl target management UI
    - Error log viewer
    - Manual trigger buttons
    - _Requirements: 7.1, 7.3, 7.4_

- [x] 21. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all requirements are covered
  - Run full integration test suite

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The NLP engine is a separate Python service communicating via REST API
- Frontend tasks can be parallelized with backend development after API contracts are defined
