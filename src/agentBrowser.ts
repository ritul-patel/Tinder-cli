import { exec } from 'child_process';
import { promisify } from 'util';
import * as http from 'http';

const execAsync = promisify(exec);

export class AgentBrowserControl {
  private browserCmd = 'agent-browser';
  private connected = false;

  private async connect(): Promise<void> {
    if (this.connected) return;

    const wsUrl = await new Promise<string>((resolve, reject) => {
      http.get('http://localhost:9222/json/list', (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const targets = JSON.parse(data);
            const tinder = targets.find(
              (t: any) => t.type === 'page' && t.url?.includes('tinder.com')
            );
            if (!tinder)
              reject(new Error('Tinder tab not found. Open tinder.com/app/recs in Chrome first.'));
            else resolve(tinder.webSocketDebuggerUrl);
          } catch {
            reject(new Error('Could not parse CDP response from Chrome on port 9222.'));
          }
        });
      }).on('error', () =>
        reject(
          new Error('Chrome not running on port 9222. Launch Chrome with --remote-debugging-port=9222 first.')
        )
      );
    });

    await execAsync(`agent-browser connect ${wsUrl}`);
    this.connected = true;
  }

  private async run(command: string): Promise<string> {
    await this.connect();
    try {
      const { stdout, stderr } = await execAsync(`${this.browserCmd} ${command}`);
      if (stderr && typeof stderr === 'string' && stderr.includes('✗')) {
        throw new Error(stderr);
      }
      return stdout ? stdout.trim() : '';
    } catch (error) {
      throw new Error(`Browser command failed: ${error}`);
    }
  }

  async getPageText(): Promise<string> {
    const snapshot = await this.run('snapshot -i');
    const match = snapshot.match(/button "([^"]+Open [Pp]rofile[^"]*)" \[ref/);
    return match ? match[1] : '';
  }

  async swipeRight(): Promise<void> {
    const snapshot = await this.run('snapshot -i');
    const match = snapshot.match(/button "LIKE".*?\[ref=(e\d+)\]/);
    if (!match) throw new Error('LIKE button not found');
    await this.run(`click @${match[1]}`);
    console.log('✅ Swiped RIGHT');
  }

  async swipeLeft(): Promise<void> {
    const snapshot = await this.run('snapshot -i');
    const match = snapshot.match(/button "NOPE".*?\[ref=(e\d+)\]/);
    if (!match) throw new Error('NOPE button not found');
    await this.run(`click @${match[1]}`);
    console.log('✅ Swiped LEFT');
  }

  async getProfileImages(): Promise<string[]> {
    const snapshot = await this.run('snapshot -i');

    const regionMatch = snapshot.match(/region "[^"]*photos[^"]*" \[ref=(e\d+)\]/i);
    if (!regionMatch) return [];
    const regionRef = regionMatch[1];

    const tabRefs = [...snapshot.matchAll(/tab "Photo \d+".*?\[ref=(e\d+)\]/g)]
      .map((m) => m[1])
      .slice(0, 4);

    if (tabRefs.length === 0) return [];

    const urls: string[] = [];
    for (const ref of tabRefs) {
      await this.run(`click @${ref}`);
      await new Promise((r) => setTimeout(r, 400));
      const html = await this.run(`get html @${regionRef}`);
      const match = html.match(/https:\/\/images[^"'<]+gotinder[^"'<]+/);
      if (match) {
        const url = match[0].replace(/&amp;/g, '&').replace(/&quot;.*$/, '').trim();
        if (url.startsWith('https://') && !urls.includes(url)) {
          urls.push(url);
        }
      }
    }

    return urls;
  }

  async nextProfile(waitTime = 3000): Promise<void> {
    await new Promise((r) => setTimeout(r, waitTime));
  }

  async getProfileState(): Promise<{ loaded: boolean; outOfLikes: boolean }> {
    const snapshot = await this.run('snapshot -i');
    const lower = snapshot.toLowerCase();
    return {
      loaded: snapshot.includes('button "NOPE"') && snapshot.includes('button "LIKE"'),
      outOfLikes:
        lower.includes('unlimited likes') ||
        lower.includes('select a plan') ||
        lower.includes('out of likes'),
    };
  }

  async openTinder(): Promise<void> {
    await this.run('open https://tinder.com/app/recs');
    await new Promise((r) => setTimeout(r, 3000));
  }
}
