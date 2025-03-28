const puppeteer = require('puppeteer');
const axios = require('axios');

class JobScraper {
    static async createBrowser() {
        return await puppeteer.launch({
            headless: true,
            args: [
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--disable-setuid-sandbox',
                '--no-sandbox',
                '--start-maximized',
                '--disable-extensions', 
                '--disable-popup-blocking',
                '--disable-notifications',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process'
            ],
            defaultViewport: null,
            ignoreHTTPSErrors: true
        });
    }

    static async scrapeXing() {
        const browser = await this.createBrowser();
        const page = await browser.newPage();
        
        try {
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            });

            await page.setViewport({
                width: 1920,
                height: 1080
            });

            await page.setJavaScriptEnabled(true);
            
            console.log('Navigating to Xing jobs page...');
            
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries) {
                try {
                    await page.goto('https://www.xing.com/jobs/search?keywords=junior+developer+nodejs&location=Germany', {
                        waitUntil: 'networkidle0',
                        timeout: 60000
                    });
                    break;
                } catch (error) {
                    retryCount++;
                    if (retryCount === maxRetries) throw error;
                    console.log(`Navigation attempt ${retryCount} failed, retrying...`);
                    await page.waitForTimeout(5000);
                }
            }
            
            // Wait longer for initial content load
            await page.waitForTimeout(5000);
            
            // Scroll multiple times to load more content
            for (let i = 0; i < 3; i++) {
                await page.evaluate(() => {
                    window.scrollTo(0, document.body.scrollHeight);
                });
                await page.waitForTimeout(2000);
            }
            
            console.log('Waiting for Xing job listings...');
            
            // Updated selectors for Xing's current layout
            const selectors = [
                'article[data-testid="job-card"]',
                '.job-posting-card',
                '.job-listing-item',
                '[data-testid="job-search-result"]'
            ];
            
            let jobs = [];
            for (const selector of selectors) {
                try {
                    console.log(`Trying selector: ${selector}`);
                    await page.waitForSelector(selector, { timeout: 10000 });
                    
                    // Take a screenshot for debugging
                    await page.screenshot({ path: 'xing-debug.png' });
                    
                    jobs = await page.evaluate((sel) => {
                        const items = document.querySelectorAll(sel);
                        console.log(`Found ${items.length} items with selector ${sel}`);
                        
                        return Array.from(items).map(item => {
                            // Try multiple possible selectors for each field
                            const titleElement = 
                                item.querySelector('h3, h2, [data-testid="job-title"], .job-title') ||
                                item.querySelector('[data-testid="job-teaser-list-title"]');
                            
                            const companyElement = 
                                item.querySelector('[data-testid="job-company"], .company-name') ||
                                item.querySelector('.job-teaser-list-item-styles__Company-sc-4c7b5190-7');
                            
                            const locationElement = 
                                item.querySelector('[data-testid="job-location"], .location') ||
                                item.querySelector('.job-teaser-list-item-styles__City-sc-4c7b5190-6');
                            
                            const linkElement = 
                                item.querySelector('a[href*="/jobs/"]') ||
                                item.closest('a[href*="/jobs/"]');
                            
                            const title = titleElement ? titleElement.innerText.trim() : '';
                            const description = item.textContent.trim();
                            
                            // Get the posting date
                            const dateElement = item.querySelector('.job-teaser-list-item-styles__Date-sc-4c7b5190-9');
                            const postedDate = dateElement ? dateElement.innerText.trim() : 'Unknown';
                            
                            // Log what we found for debugging
                            console.log('Found job:', {
                                title,
                                company: companyElement ? companyElement.innerText.trim() : 'Not found',
                                location: locationElement ? locationElement.innerText.trim() : 'Not found',
                                url: linkElement ? linkElement.href : 'Not found'
                            });
                            
                            const isJuniorLevel = 
                                title.toLowerCase().includes('junior') ||
                                title.toLowerCase().includes('entry') ||
                                title.toLowerCase().includes('graduate') ||
                                title.toLowerCase().includes('trainee') ||
                                description.toLowerCase().includes('junior') ||
                                description.toLowerCase().includes('entry') ||
                                description.toLowerCase().includes('graduate') ||
                                description.toLowerCase().includes('trainee');
                            
                            const isNodeJsJob = 
                                title.toLowerCase().includes('node') ||
                                title.toLowerCase().includes('nodejs') ||
                                title.toLowerCase().includes('node.js') ||
                                description.toLowerCase().includes('node') ||
                                description.toLowerCase().includes('nodejs') ||
                                description.toLowerCase().includes('node.js');
                            
                            if (!isJuniorLevel || !isNodeJsJob) return null;
                            
                            const job = {
                                title: title,
                                company: companyElement ? companyElement.innerText.trim() : '',
                                location: locationElement ? locationElement.innerText.trim() : '',
                                url: linkElement ? linkElement.href : '',
                                source: 'Xing',
                                experienceLevel: 'Junior',
                                postedDate: postedDate
                            };

                            // Validate all required fields are present and not empty
                            if (!job.title || !job.company || !job.location || !job.url) {
                                console.log('Invalid job:', job);
                                return null;
                            }

                            return job;
                        }).filter(job => job !== null);
                    }, selector);
                    
                    if (jobs.length > 0) {
                        console.log(`Found ${jobs.length} jobs using selector: ${selector}`);
                        break;
                    }
                } catch (e) {
                    console.log(`Selector ${selector} not found or error:`, e.message);
                }
            }
            
            console.log('\n=== Xing Jobs Scraped ===');
            console.log(`Total jobs found: ${jobs.length}`);
            if (jobs.length > 0) {
                console.log('\nJob Details:');
                jobs.forEach((job, index) => {
                    console.log(`\n${index + 1}. ${job.title}`);
                    console.log(`   Company: ${job.company}`);
                    console.log(`   Location: ${job.location}`);
                    console.log(`   URL: ${job.url}`);
                });
            } else {
                console.log('No jobs found - check selectors and page content');
            }
            console.log('\n===========================\n');
            
            return jobs;
        } catch (error) {
            console.error('Error scraping Xing:', error.message);
            await page.screenshot({ path: 'xing-error.png' });
            return [];
        } finally {
            await browser.close();
        }
    }

    static async scrapeLinkedIn() {
        const browser = await this.createBrowser();
        const page = await browser.newPage();
        
        try {
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            });

            await page.setViewport({
                width: 1920,
                height: 1080
            });

            await page.setJavaScriptEnabled(true);
            
            console.log('Navigating to LinkedIn jobs page...');
            
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries) {
                try {
                    await page.goto('https://www.linkedin.com/jobs/search?keywords=junior%20developer%20nodejs&location=Germany&f_E=2&sortBy=DD', {
                        waitUntil: 'networkidle0',
                        timeout: 60000
                    });
                    break;
                } catch (error) {
                    retryCount++;
                    if (retryCount === maxRetries) throw error;
                    console.log(`Navigation attempt ${retryCount} failed, retrying...`);
                    await page.waitForTimeout(5000);
                }
            }
            
            await page.waitForTimeout(5000);
            
            console.log('Waiting for LinkedIn job listings...');
            
            const selectors = [
                '.jobs-search__results-list > li',
                '.job-search-card'
            ];
            
            let jobs = [];
            for (const selector of selectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 10000 });
                    jobs = await page.evaluate((sel) => {
                        const items = document.querySelectorAll(sel);
                        return Array.from(items).map(item => {
                            const titleElement = item.querySelector('h3.base-search-card__title, .job-card-list__title');
                            const companyElement = item.querySelector('.base-search-card__subtitle, .job-card-container__company-name');
                            const locationElement = item.querySelector('.job-search-card__location, .job-card-container__metadata-item');
                            const linkElement = item.querySelector('.base-card__full-link, a.job-card-list__title');
                            
                            const title = titleElement ? titleElement.innerText.trim() : '';
                            
                            const dateElement = item.querySelector('.job-search-card__listdate');
                            const postedDate = dateElement ? 
                                this.parseLinkedInDate(dateElement.innerText.trim()) : 
                                new Date().toISOString();

                            const job = {
                                title: title,
                                company: companyElement ? companyElement.innerText.trim() : '',
                                location: locationElement ? locationElement.innerText.trim() : '',
                                url: linkElement ? linkElement.href : '',
                                source: 'LinkedIn',
                                experienceLevel: 'Junior',
                                postedDate: postedDate
                            };

                            return job;
                        }).filter(job => job.title && job.company && job.location && job.url);
                    }, selector);
                    
                    if (jobs.length > 0) {
                        console.log(`Found ${jobs.length} jobs using selector: ${selector}`);
                        break;
                    }
                } catch (e) {
                    console.log(`Selector ${selector} not found, trying next...`);
                }
            }
            
            console.log('\n=== LinkedIn Jobs Scraped ===');
            console.log(`Total jobs found: ${jobs.length}`);
            console.log('\nJob Details:');
            jobs.forEach((job, index) => {
                console.log(`\n${index + 1}. ${job.title}`);
                console.log(`   Company: ${job.company}`);
                console.log(`   Location: ${job.location}`);
                console.log(`   URL: ${job.url}`);
            });
            console.log('\n===========================\n');
            
            return jobs;
        } catch (error) {
            console.error('Error scraping LinkedIn:', error.message);
            await page.screenshot({ path: 'linkedin-error.png' });
            return [];
        }
    }

    static async scrapeStepStone() {
        const browser = await this.createBrowser();
        const page = await browser.newPage();
        
        try {
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            });

            await page.setViewport({
                width: 1920,
                height: 1080
            });

            await page.setJavaScriptEnabled(true);
            
            console.log('Navigating to StepStone jobs page...');
            
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries) {
                try {
                    await page.goto('https://www.stepstone.de/jobs/junior-nodejs-developer/in-deutschland?radius=30&sort=date', {
                        waitUntil: 'domcontentloaded',
                        timeout: 60000
                    });
                    break;
                } catch (error) {
                    retryCount++;
                    if (retryCount === maxRetries) throw error;
                    console.log(`Navigation attempt ${retryCount} failed, retrying...`);
                    await page.waitForTimeout(5000);
                }
            }
            
            await page.waitForTimeout(Math.random() * 3000 + 2000);
            
            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
                return new Promise(resolve => setTimeout(resolve, 2000));
            });
            
            console.log('Waiting for StepStone job listings...');
            
            const selectors = [
                '[data-testid="job-item"]',
                '[data-at="job-item"]',
                '.res-sfoyn7'
            ];
            
            let jobs = [];
            for (const selector of selectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 10000 });
                    jobs = await page.evaluate((sel) => {
                        const items = document.querySelectorAll(sel);
                        return Array.from(items).map(item => {
                            const titleElement = item.querySelector('[data-testid="job-item-title"], .res-1tassqi a');
                            const companyElement = item.querySelector('[data-at="job-item-company-name"], .res-1c5ai0d');
                            const locationElement = item.querySelector('[data-at="job-item-location"], .res-1qh7elo');
                            const linkElement = item.querySelector('a[data-testid="job-item-title"], .res-1tassqi a');
                            
                            const title = titleElement ? titleElement.innerText.trim() : '';
                            const description = item.querySelector('[data-at="job-item-description"], .res-1q7q8q8')?.innerText.trim() || '';
                            
                            const dateElement = item.querySelector('.job-teaser-list-item-styles__Date-sc-4c7b5190-8');
                            const postedDate = dateElement ? 
                                this.parseStepStoneDate(dateElement.innerText.trim()) : 
                                new Date().toISOString();

                            const isJuniorLevel = 
                                title.toLowerCase().includes('junior') ||
                                title.toLowerCase().includes('entry') ||
                                title.toLowerCase().includes('graduate') ||
                                title.toLowerCase().includes('trainee') ||
                                description.toLowerCase().includes('junior') ||
                                description.toLowerCase().includes('entry') ||
                                description.toLowerCase().includes('graduate') ||
                                description.toLowerCase().includes('trainee');
                            
                            const isNodeJsJob = 
                                title.toLowerCase().includes('node') ||
                                title.toLowerCase().includes('nodejs') ||
                                title.toLowerCase().includes('node.js') ||
                                description.toLowerCase().includes('node') ||
                                description.toLowerCase().includes('nodejs') ||
                                description.toLowerCase().includes('node.js');
                            
                            if (!isJuniorLevel || !isNodeJsJob) return null;
                            
                            const job = {
                                title: title,
                                company: companyElement ? companyElement.innerText.trim() : '',
                                location: locationElement ? locationElement.innerText.trim() : '',
                                url: linkElement ? linkElement.href : '',
                                source: 'StepStone',
                                experienceLevel: 'Junior',
                                postedDate: postedDate
                            };

                            // Validate all required fields are present and not empty
                            if (!job.title || !job.company || !job.location || !job.url) {
                                return null;
                            }

                            return job;
                        }).filter(job => job !== null);
                    }, selector);
                    
                    if (jobs.length > 0) {
                        console.log(`Found ${jobs.length} jobs using selector: ${selector}`);
                        break;
                    }
                } catch (e) {
                    console.log(`Selector ${selector} not found, trying next...`);
                }
            }
            
            console.log('\n=== StepStone Jobs Scraped ===');
            console.log(`Total jobs found: ${jobs.length}`);
            console.log('\nJob Details:');
            jobs.forEach((job, index) => {
                console.log(`\n${index + 1}. ${job.title}`);
                console.log(`   Company: ${job.company}`);
                console.log(`   Location: ${job.location}`);
                console.log(`   URL: ${job.url}`);
            });
            console.log('\n===========================\n');
            
            return jobs;
        } catch (error) {
            console.error('Error scraping StepStone:', error.message);
            await page.screenshot({ path: 'stepstone-error.png' });
            return [];
        }
    }

    static async getAllJobs() {
        console.log('Starting job scraping from all sources...');
        
        try {
            const [linkedinJobs, xingJobs, stepstoneJobs] = await Promise.all([
                this.scrapeLinkedIn(),
                this.scrapeXing(),
                this.scrapeStepStone()
            ]);
            
            const allJobs = [...linkedinJobs, ...xingJobs, ...stepstoneJobs];
            
            const uniqueJobs = this.deduplicateJobs(allJobs);
            
            console.log('\n=== Final Results ===');
            console.log(`Total unique jobs found: ${uniqueJobs.length}`);
            console.log(`LinkedIn jobs: ${linkedinJobs.length}`);
            console.log(`Xing jobs: ${xingJobs.length}`);
            console.log(`StepStone jobs: ${stepstoneJobs.length}`);
            console.log('\n===========================\n');
            
            return uniqueJobs;
        } catch (error) {
            console.error('Error in getAllJobs:', error);
            return [];
        }
    }

    static deduplicateJobs(jobs) {
        const seen = new Set();
        return jobs.filter(job => {
            const key = `${job.title.toLowerCase()}-${job.company.toLowerCase()}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    static parseLinkedInDate(dateStr) {
        try {
            const now = new Date();
            const lowerDate = dateStr.toLowerCase();
            
            if (lowerDate.includes('just now') || lowerDate.includes('today')) {
                return now.toISOString();
            }
            
            if (lowerDate.includes('yesterday')) {
                const yesterday = new Date(now);
                yesterday.setDate(yesterday.getDate() - 1);
                return yesterday.toISOString();
            }
            
            if (lowerDate.includes('week')) {
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return weekAgo.toISOString();
            }
            
            if (lowerDate.includes('month')) {
                const monthAgo = new Date(now);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return monthAgo.toISOString();
            }
            
            // Try to parse specific date format
            const date = new Date(dateStr);
            if (!isNaN(date)) {
                return date.toISOString();
            }
            
            return now.toISOString();
        } catch (error) {
            console.error('Error parsing LinkedIn date:', error);
            return new Date().toISOString();
        }
    }

    static parseStepStoneDate(dateStr) {
        try {
            const now = new Date();
            const lowerDate = dateStr.toLowerCase();
            
            if (lowerDate.includes('heute')) {
                return now.toISOString();
            }
            
            if (lowerDate.includes('gestern')) {
                const yesterday = new Date(now);
                yesterday.setDate(yesterday.getDate() - 1);
                return yesterday.toISOString();
            }
            
            if (lowerDate.includes('woche')) {
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return weekAgo.toISOString();
            }
            
            if (lowerDate.includes('monat')) {
                const monthAgo = new Date(now);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return monthAgo.toISOString();
            }
            
            // Try to parse specific date format
            const date = new Date(dateStr);
            if (!isNaN(date)) {
                return date.toISOString();
            }
            
            return now.toISOString();
        } catch (error) {
            console.error('Error parsing StepStone date:', error);
            return new Date().toISOString();
        }
    }
}

module.exports = JobScraper; 