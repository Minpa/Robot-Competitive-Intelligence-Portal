# Requirements Document

## Introduction

The Robot Competitive Intelligence Portal is a web application for monitoring market trends in the robotics industry. It collects, organizes, and analyzes competitor product information, specifications, pricing, press releases, and reviews. The portal provides weekly updated time-series data and keyword dashboards to support business planning, R&D strategy, and executive reporting for internal robot development teams.

## Glossary

- **Portal**: The Robot Competitive Intelligence Portal web application
- **Crawler**: The automated web crawling microservice that collects data from target websites
- **Scheduler**: The component that manages automated crawling job execution timing
- **Company**: A robot manufacturer or competitor organization being tracked
- **Product**: A specific robot product or model offered by a company
- **Product_Spec**: Technical specifications associated with a robot product
- **Article**: A news article, press release, review, or blog post related to a company or product
- **Keyword**: An extracted term or topic from articles and product descriptions
- **Keyword_Stats**: Statistical data about keyword frequency and trends over time periods
- **Dashboard**: The visual interface displaying charts, graphs, and summary metrics
- **Admin**: A user with elevated privileges to manage crawling configuration and system settings
- **Content_Hash**: A unique identifier generated from article content for deduplication
- **NLP_Engine**: The natural language processing component for keyword extraction
- **Time_Series**: Data points indexed in time order for trend analysis

## Requirements

### Requirement 1: Web Crawling and Data Collection

**User Story:** As a data analyst, I want the system to automatically crawl competitor websites, so that I can have up-to-date information without manual data entry.

#### Acceptance Criteria

1. WHEN the Scheduler triggers a crawl job, THE Crawler SHALL collect data from configured target URLs including product pages, spec sheets, pricing pages, blogs, and press releases
2. WHEN the Crawler collects an article or page, THE Portal SHALL generate a Content_Hash and check for duplicates before storing
3. WHEN a duplicate Content_Hash is detected, THE Portal SHALL skip storage and log the duplicate detection
4. WHEN the Crawler encounters a new article with unique Content_Hash, THE Portal SHALL normalize the content format and store it in the database
5. THE Scheduler SHALL support configurable crawling frequency with minimum weekly execution capability
6. WHEN the Crawler fails to collect from a target URL, THE Portal SHALL log the failure with error details and continue processing remaining URLs
7. THE Crawler SHALL support incremental collection by tracking last-crawled timestamps per URL

### Requirement 2: Content Organization and Entity Structure

**User Story:** As a product manager, I want competitor data organized by company, product lineup, and model, so that I can easily navigate and compare products.

#### Acceptance Criteria

1. THE Portal SHALL organize data in a hierarchical structure: Company → Product Lineup → Model
2. WHEN a new Company is added, THE Portal SHALL store name, country, category, homepage URL, and description
3. WHEN a new Product is added, THE Portal SHALL associate it with a Company and store name, series, type, release date, target market, and status
4. WHEN Product_Spec data is collected, THE Portal SHALL store DoF, max payload, speed, battery life, sensors, control method, OS/SDK, and price range
5. WHEN an Article is stored, THE Portal SHALL associate it with related Company and Product entities via tagging
6. THE Portal SHALL support product categorization including humanoid, service, logistics, and home robot types

### Requirement 3: Keyword Extraction and Trend Analysis

**User Story:** As a market researcher, I want automatic keyword extraction and trend analysis, so that I can identify emerging topics and market shifts.

#### Acceptance Criteria

1. WHEN new Article content is stored, THE NLP_Engine SHALL extract keywords and topics from the text
2. THE NLP_Engine SHALL support both Korean and English language processing
3. THE Portal SHALL calculate weekly keyword frequency counts and store them as Keyword_Stats
4. THE Portal SHALL calculate monthly keyword frequency counts and store them as Keyword_Stats
5. WHEN calculating Keyword_Stats, THE Portal SHALL compute the change rate (delta) compared to the previous period
6. THE Portal SHALL associate extracted keywords with related Company and Product entities

### Requirement 4: Web Portal List and Detail Views

**User Story:** As an R&D engineer, I want to browse and filter competitor products through a web interface, so that I can benchmark against our products.

#### Acceptance Criteria

1. THE Portal SHALL display list views for competitors, products, and articles in a board-style layout
2. THE Portal SHALL provide detail pages showing comprehensive information for each entity
3. WHEN displaying a Product detail page, THE Portal SHALL show product overview, spec table, pricing information, article timeline, and related keywords
4. THE Portal SHALL support filtering by company, product line, release year, price range, spec ranges, keywords, and country
5. THE Portal SHALL support sorting by latest update, release date, article count, and interest level
6. WHEN a user applies filters, THE Portal SHALL return matching results within 2 seconds for datasets up to 10,000 items

### Requirement 5: Time-Series Reports and Dashboard

**User Story:** As an executive, I want visual dashboards showing weekly trends, so that I can quickly understand market movements for strategic decisions.

#### Acceptance Criteria

1. THE Dashboard SHALL display a weekly update timeline showing new product releases, article exposure trends, and keyword frequency trends
2. THE Dashboard SHALL render data as charts and graphs for visual analysis
3. THE Dashboard SHALL include a "This Week's Highlights" section showing new products, price changes, PR peaks, and trending keywords
4. WHEN new data is collected, THE Dashboard SHALL reflect updates within the next scheduled refresh cycle
5. THE Portal SHALL support both dark and light theme options for dashboard display

### Requirement 6: Export and Report Generation

**User Story:** As a strategy team member, I want to export filtered data and charts, so that I can create executive presentation slides.

#### Acceptance Criteria

1. WHEN a user requests export, THE Portal SHALL generate downloadable files in CSV and Excel formats
2. THE Portal SHALL support chart and table image capture for presentation use
3. THE Portal SHALL provide a print-friendly report view optimized for executive reports
4. WHEN exporting, THE Portal SHALL apply the current filter selections to the exported data
5. THE Portal SHALL support both dark and light theme options for exported images

### Requirement 7: Admin Crawling Management

**User Story:** As an admin, I want to manage crawling targets and monitor collection status, so that I can ensure data quality and troubleshoot issues.

#### Acceptance Criteria

1. THE Portal SHALL provide an admin UI for managing crawling target domains, URLs, and patterns
2. THE Portal SHALL allow admins to configure per-site crawling frequency and rate limits
3. THE Portal SHALL display collection failure logs with error details for monitoring
4. WHEN an admin triggers manual re-collection, THE Crawler SHALL immediately execute a crawl job for the specified target
5. THE Portal SHALL restrict admin functions to users with admin role privileges

### Requirement 8: Search Performance and Reliability

**User Story:** As a user, I want fast search results and reliable data collection, so that I can work efficiently without system delays.

#### Acceptance Criteria

1. WHEN a user performs a search query, THE Portal SHALL return results within 2 seconds for datasets containing thousands of articles and products
2. WHEN the Crawler encounters website format changes, THE Portal SHALL log the parsing error and continue processing other targets
3. THE Portal SHALL implement exception handling for all crawling operations to prevent system-wide failures
4. THE Portal SHALL maintain data freshness with minimum weekly automated collection cycles

### Requirement 9: Security and Access Control

**User Story:** As a security administrator, I want role-based access control, so that sensitive competitive intelligence is protected from unauthorized access.

#### Acceptance Criteria

1. THE Portal SHALL implement role-based access control with distinct user roles
2. THE Portal SHALL support integration with VPN or IAM systems for authentication
3. WHEN a user without admin role attempts admin functions, THE Portal SHALL deny access and log the attempt
4. THE Portal SHALL only collect publicly available information to ensure compliance with website terms of service

### Requirement 10: Data Model and Storage

**User Story:** As a developer, I want a well-structured data model, so that I can efficiently query and maintain the competitive intelligence database.

#### Acceptance Criteria

1. THE Portal SHALL store Company entities with fields: name, country, category, homepage_url, description
2. THE Portal SHALL store Product entities with fields: company_id, name, series, type, release_date, target_market, status
3. THE Portal SHALL store Product_Spec entities with fields: product_id, dof, payload, speed, battery_life, sensors (JSON), control_architecture, os, sdk, price_min, price_max
4. THE Portal SHALL store Article entities with fields: product_id, company_id, title, source, url, published_at, summary, language, content_hash
5. THE Portal SHALL store Keyword entities with fields: term, language, category
6. THE Portal SHALL store Keyword_Stats entities with fields: keyword_id, period, count, delta, related_company_id, related_product_id
