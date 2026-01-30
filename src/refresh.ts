import { execa } from 'execa';
import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';

// --- Configuration ---

// 1. Mandatory: This will ALWAYS run
const ASTRO_DOC = { 
  name: 'Astro', 
  repo: 'https://github.com/withastro/docs', 
  gitPath: 'src/content/docs/en', 
  localDest: 'docs/astro' 
};

// 2. Optional: User can choose these
const OPTIONAL_DOCS = [
  { 
    name: 'Tailwind CSS', 
    value: 'tailwind', // ID used for selection
    repo: 'https://github.com/tailwindlabs/tailwindcss.com', 
    gitPath: 'src', 
    localDest: 'docs/tailwind' 
  },
  { 
    name: 'React', 
    value: 'react',
    repo: 'https://github.com/reactjs/react.dev', 
    gitPath: 'src/content', 
    localDest: 'docs/react' 
  },
  { 
    name: 'TypeScript', 
    value: 'typescript',
    repo: 'https://github.com/microsoft/TypeScript-Website', 
    gitPath: 'packages/documentation/copy/en', 
    localDest: 'docs/typescript' 
  },
];

// --- Helper Functions ---

async function downloadDoc(doc: any) {
  const spinner = ora(`Downloading ${chalk.bold(doc.name)}...`).start();
  
  const tempDir = path.resolve(`temp_${doc.name.toLowerCase().replace(/\s/g, '')}`);
  const destDir = path.resolve(doc.localDest);

  try {
    await fs.remove(tempDir);

    // Clone & Checkout
    await execa('git', ['clone', '--quiet', '--depth', '1', '--filter=blob:none', '--sparse', doc.repo, tempDir]);
    await execa('git', ['sparse-checkout', 'set', doc.gitPath], { cwd: tempDir });

    // Move Files
    await fs.ensureDir(destDir);
    await fs.emptyDir(destDir);
    
    const sourcePath = path.join(tempDir, doc.gitPath);
    if (await fs.pathExists(sourcePath)) {
        await fs.copy(sourcePath, destDir);
        spinner.succeed(`${chalk.green(doc.name)} updated`);
    } else {
        throw new Error(`Path '${doc.gitPath}' not found in repo`);
    }

  } catch (error) {
    spinner.fail(`${chalk.red(doc.name)} failed`);
    if (error instanceof Error) console.error(chalk.dim(`  ${error.message}`));
  } finally {
    await fs.remove(tempDir);
  }
}

async function main() {
  console.clear();
  console.log(chalk.bold.blue('\n🚀 Astro Knowledge Refresh Protocol\n'));

  // --- Step 1: User Selection ---
  
  const answer = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedDocs',
      message: 'Which additional documentation libraries do you need?',
      choices: OPTIONAL_DOCS.map(d => ({ name: d.name, value: d.value, checked: true })), // Default all checked
      loop: false,
    },
  ]);

  // Filter the optional list based on user choice
  const selectedOptionals = OPTIONAL_DOCS.filter(doc => 
    answer.selectedDocs.includes(doc.value)
  );

  // Combine Mandatory + Selected
  const downloadQueue = [ASTRO_DOC, ...selectedOptionals];
  
  // Clean up unselected docs from the disk (optional, but keeps the DB clean)
  const unselectedDocs = OPTIONAL_DOCS.filter(doc => !answer.selectedDocs.includes(doc.value));
  if (unselectedDocs.length > 0) {
      console.log(chalk.gray(`\nCleaning up unselected docs...`));
      for (const doc of unselectedDocs) {
          await fs.remove(path.resolve(doc.localDest));
      }
  }

  console.log(chalk.gray('\n-----------------------------------'));

  // --- Step 2: Download ---
  
  // Sequential download to prevent UI glitches
  for (const doc of downloadQueue) {
    await downloadDoc(doc);
  }

  console.log(chalk.gray('\n-----------------------------------'));
  
  // --- Step 3: Ingest ---

  const ingestSpinner = ora('🧠 Re-indexing Knowledge Base...').start();
  try {
    await execa('npx', ['tsx', 'src/ingest.ts'], {
      stdio: 'inherit',
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' }
    });
    ingestSpinner.succeed('Knowledge Base Updated!');
  } catch (error) {
    ingestSpinner.fail('Ingestion failed');
    console.error(error);
  }

  console.log(chalk.bold.green('\n✨ Ready to help!'));
}

main();