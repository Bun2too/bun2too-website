import {test,expect} from '@playwright/test';
test('insights reuses the consent form and exposes feeds without overflow',async({page})=>{
 await page.goto('/insights');
 await expect(page.locator('main h1')).toContainText('Human thinking.');
 await expect(page.getByRole('link',{name:'RSS',exact:true})).toHaveAttribute('href','/insights/feed.xml');
 await expect(page.getByRole('link',{name:'Atom',exact:true})).toHaveAttribute('href','/insights/feed.atom');
 await expect(page.locator('.newsletter-form').getByLabel('AI & automation',{exact:true})).toBeChecked();
 await expect(page.locator('.newsletter-form').getByLabel('I agree to receive email updates',{exact:false})).not.toBeChecked();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('embedded signup permits only the selected framing origins',async({page})=>{
 const response=await page.goto('/insights/signup');
 expect(response?.headers()['content-security-policy']).toContain('https://editorial.example.invalid');
 await expect(page.locator('.newsletter-form')).toBeVisible();
 await expect(page.locator('.site-header')).toBeHidden();
});
