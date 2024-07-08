import os
import yaml

def generate_podcast_metadata(podcast_dir, data_dir):
    podcast_metadata = []
    for arxiv_id in os.listdir(os.path.join(data_dir, 'arxiv', 'audio')):
        metadata = {
            'title': f'Podcast Episode for {arxiv_id}',
            'arxiv_id': arxiv_id,
            'pdf': f'/static/podcast_data/arxiv/pdfs/{arxiv_id}.pdf',
            'audio': f'/static/podcast_data/arxiv/audio/{arxiv_id}.mp3',
            'transcript': f'/static/podcast_data/arxiv/transcripts/{arxiv_id}.txt',
        }
        podcast_metadata.append(metadata)
        with open(os.path.join(podcast_dir, f'{arxiv_id}.yml'), 'w') as f:
            yaml.dump(metadata, f)

if __name__ == '__main__':
    generate_podcast_metadata('podcast', 'static/podcast_data')
