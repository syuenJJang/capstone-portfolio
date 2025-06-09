const AWS = require('aws-sdk');
const axios = require('axios');
const FormData = require('form-data');
const mongoose = require('mongoose');

// AWS S3 설정
const s3 = new AWS.S3({
    region: 'ap-northeast-2'
});

// OpenAI 설정
const { OpenAI } = require('openai');

// 환경변수 체크
if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다.');
    throw new Error('OPENAI_API_KEY 환경변수가 필요합니다.');
}

if (!process.env.STABILITY_API_KEY) {
    console.error('STABILITY_API_KEY 환경변수가 설정되지 않았습니다.');
    throw new Error('STABILITY_API_KEY 환경변수가 필요합니다.');
}

if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI 환경변수가 설정되지 않았습니다.');
    throw new Error('MONGODB_URI 환경변수가 필요합니다.');
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// MongoDB 스키마 정의 - 여러 꽃 정보를 배열로 저장
const imageSchema = new mongoose.Schema({
    userId: {type: mongoose.Schema.Types.ObjectId, required: true},
    userName: {type: String, required: true},
    createdAt: {type: Date, default: Date.now},
    backgroundType: {type: String, required: true},
    flowerName: {type: [String], required: true},
    flowerColor: {type: [String], required: true},
    flowerSeason: {type: [String], required: false},
    imageUrl: {type: String,required: true}
});

// MongoDB 연결 상태 관리
let cachedDb = null;
let ImageModel = null;

async function connectToDatabase() {
    if (cachedDb && mongoose.connection.readyState === 1) {
        return { db: cachedDb, ImageModel };
    }

    try {
        console.log('MongoDB 연결 시도...');
        console.log('MongoDB URI 존재 여부:', !!process.env.MONGODB_URI);
        
        const connection = await mongoose.connect(process.env.MONGODB_URI);
        
        cachedDb = connection.connection.db;
        
        // 모델이 이미 등록되어 있는지 확인
        if (!ImageModel) {
            ImageModel = mongoose.model('Image', imageSchema);
        }
        
        console.log('MongoDB 연결 성공');
        return { db: cachedDb, ImageModel };
    } catch (error) {
        console.error('MongoDB 연결 실패:', error);
        throw error;
    }
}

const imagePaths = {
    "1": {
        image: 's3-uri',
        imagemask: 's3-uri',
        type: '꽃다발'
    },
    "2": {
        image: 's3-uri',
        imagemask: 's3-uri',
        type: '꽃바구니'
    },
    "3": {
        image: 's3-uri',
        imagemask: 's3-uri',
        type: '꽃화분'
    },
    "4": {
        image: 's3-uri',
        imagemask: 's3-uri',
        type: '꽃박스'
    }
};

exports.handler = async (event) => {
    // CORS 헤더 설정
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // OPTIONS 요청 처리 (CORS preflight)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    let dbConnection = null;

    try {
        // MongoDB 연결
        dbConnection = await connectToDatabase();
        const { ImageModel } = dbConnection;

        // 요청 데이터 파싱
        const { selectoption, set1, set2, set3, userId, userName } = JSON.parse(event.body);
        console.log("클라이언트 요청 데이터:", { selectoption, set1, set2, set3, userId, userName });

        // userId와 userName 유효성 검사
        if (!userId || !userName) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'userId와 userName이 필요합니다.' })
            };
        }

        // 이미지 경로 가져오기
        const imagePath = imagePaths[selectoption].image;
        const maskPath = imagePaths[selectoption].imagemask;
        const backgroundType = imagePaths[selectoption].type;

        // null이 아닌 세트들만 수집
        const activeSets = [set1, set2, set3].filter(set => set !== null);
        
        if (activeSets.length === 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: '선택된 꽃 세트가 없습니다.' })
            };
        }

        // 꽃 정보로 프롬프트 텍스트 생성
        let flowerSets = [];
        activeSets.forEach(set => {
            flowerSets.push(`${set.name} ${set.color}`);
        });

        // let promptText = "해당 이미지는 inpaint 기능에 사용 할것이다. 꽃들의 특징이 명확해야한다. 반드시 지정된 꽃과 색깔을 사용해야한다. 꽃이 조화롭게 섞여야한다. 꽃은 만개된 꽃이여야한다. 꽃들의 밀도는 높아야한다.";
        // promptText += flowerSets.join(", ") + "으로 구성된 ";
        // promptText += backgroundType + ". ";
        // promptText += "조건에 맞는 프롬프트를 추천해라. 실제 꽃가게 판매꽃같이 유사해야한다. 영어로된 프롬프트이며 프롬프트 이외 출력하지 않아도 된다.";
        let promptText = "해당 이미지는 inpaint 기능에 사용할 것이다. 각 꽃의 고유한 특징이 명확하게 드러나야 한다. 모든 꽃이 완전히 만개한 상태여야 하며, 많은 수의 꽃들이 빽빽하게 채워져야 한다. 꽃이 자연스럽게 조화를 이뤄야 한다.";
        promptText += flowerSets.join(", ") + "으로 구성된 ";
        promptText += backgroundType + ". ";
        promptText += "조건을 모두 만족하는 영어 프롬프트를 생성해라. 실제 전문 꽃가게에서 판매하는 고품질 수준이어야 한다. 다른 설명 없이 영어 프롬프트만 출력해라.";

        console.log("생성된 프롬프트 텍스트:", promptText);

        // URL에서 이미지 다운로드하여 base64로 변환하는 함수
        async function downloadImageAsBase64(url) {
            try {
                const response = await axios.get(url, { responseType: 'arraybuffer' });
                const base64 = Buffer.from(response.data, 'binary').toString('base64');
                return base64;
            } catch (error) {
                console.error(`이미지 다운로드 실패 (${url}):`, error);
                throw error;
            }
        }

        // 이미지를 base64로 변환
        let base64Image;
        try {
            base64Image = await downloadImageAsBase64(imagePath);
            console.log("이미지 다운로드 및 변환 성공, 길이:", base64Image.length);
        } catch (err) {
            console.error("이미지 처리 오류:", err);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: '이미지를 처리하는 중 오류가 발생했습니다.' })
            };
        }

        // OpenAI API 호출하여 프롬프트 생성
        console.log("OpenAI API 호출 중...");
        let gptResponse;
        try {
            gptResponse = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: promptText },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/png;base64,${base64Image}`,
                                    detail: "high"
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 300
            });
        } catch (openaiError) {
            console.error("OpenAI API 호출 오류:", openaiError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'OpenAI API 호출 중 오류가 발생했습니다.',
                    details: openaiError.message 
                })
            };
        }

        // GPT의 응답 추출
        const GPTprompt = gptResponse.choices[0].message.content;
        console.log("생성된 GPT 프롬프트:", GPTprompt);

        // URL에서 스트림 생성하는 함수
        async function createStreamFromUrl(url) {
            const response = await axios.get(url, { responseType: 'stream' });
            return response.data;
        }

        // Stability AI Inpainting API 호출
        console.log("Stability AI Inpainting API 호출 중...");

        const negativePrompt = [
            "flower buds",           // 꽃봉오리
            "closed flowers",        // 닫힌 꽃
            "unopened blooms",       // 열리지 않은 꽃봉오리  
            "tight buds",            // 꽉 닫힌 봉오리
            "closed petals",         // 닫힌 꽃잎
            "unblossomed flowers",   // 피지 않은 꽃
            "half-opened flowers",   // 반만 핀 꽃
            "partially bloomed",     // 부분적으로 핀 꽃
            "green buds",            // 초록 봉오리
            "tight flower heads"     // 꽉 닫힌 꽃송이
        ].join(", ");

        const formData = new FormData();
        formData.append('image', await createStreamFromUrl(imagePath));
        formData.append('mask', await createStreamFromUrl(maskPath));
        formData.append('prompt', GPTprompt);
        formData.append('output_format', 'png');
        formData.append('mask_grow', 10);
        formData.append('negative_prompt', negativePrompt);


        let inpaintResponse;
        try {
            inpaintResponse = await axios.post(
                'https://api.stability.ai/v2beta/stable-image/edit/inpaint',
                formData,
                {
                    validateStatus: undefined,
                    responseType: 'arraybuffer',
                    headers: {
                        Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
                        Accept: 'image/*',
                        ...formData.getHeaders()
                    }
                }
            );
        } catch (stabilityError) {
            console.error("Stability AI API 호출 오류:", stabilityError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Stability AI API 호출 중 오류가 발생했습니다.',
                    details: stabilityError.message 
                })
            };
        }

        if (inpaintResponse.status === 200) {
            console.log("인페인팅 성공");
            console.log("응답 데이터 크기:", inpaintResponse.data.length);
            
            // S3에 업로드할 파일명 생성
            const fileName = `generated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
            const s3Key = `images/generated-flowers/${fileName}`;
            
            console.log("S3 업로드 시작:", s3Key);
            
            // S3에 이미지 업로드
            const uploadParams = {
                Bucket: 'your-bucket',
                Key: s3Key,
                Body: Buffer.from(inpaintResponse.data),
                ContentType: 'image/png',
            };
            
            try {
                const uploadResult = await s3.upload(uploadParams).promise();
                console.log("S3 업로드 완료:", uploadResult.Location);
                
                // MongoDB에 이미지 정보 저장 - 하나의 레코드에 모든 꽃 정보 저장
                const flowerNames = [];
                const flowerColors = [];
                const flowerSeasons = [];
                
                // 모든 활성 세트의 정보를 배열로 수집
                activeSets.forEach(set => {
                    flowerNames.push(set.name);
                    flowerColors.push(set.color);
                    flowerSeasons.push(set.season || ''); // season이 없으면 빈 문자열
                });
                
                const newImage = new ImageModel({
                    userId: new mongoose.Types.ObjectId(userId),
                    userName: userName,
                    createdAt: new Date(),
                    backgroundType: backgroundType,
                    flowerName: flowerNames,      // 배열로 저장
                    flowerColor: flowerColors,    // 배열로 저장
                    flowerSeason: flowerSeasons,  // 배열로 저장
                    imageUrl: uploadResult.Location
                });
                
                const savedImage = await newImage.save();
                console.log(`이미지 정보 저장 완료:`, savedImage._id);
                console.log(`저장된 꽃들: ${flowerNames.join(', ')}`);
                console.log(`저장된 색상들: ${flowerColors.join(', ')}`);
                console.log(`저장된 계절들: ${flowerSeasons.join(', ')}`);
                
                // 생성된 이미지를 base64로 변환하여 응답에 포함
                const generatedImageBase64 = Buffer.from(inpaintResponse.data).toString('base64');
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        message: '이미지 생성 및 저장 완료',
                        image: `data:image/png;base64,${generatedImageBase64}`,
                        s3Url: uploadResult.Location,
                        s3Key: s3Key,
                        fileName: fileName,
                        prompt: GPTprompt,
                        flowerSets: activeSets,
                        savedImage: {
                            id: savedImage._id,
                            flowerNames: flowerNames,
                            flowerColors: flowerColors,
                            flowerSeasons: flowerSeasons,
                            backgroundType: backgroundType
                        }
                    })
                };
            } catch (uploadError) {
                console.error("S3 업로드 오류:", uploadError);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ 
                        error: 'S3 업로드 중 오류가 발생했습니다.',
                        details: uploadError.message 
                    })
                };
            }
        } else {
            console.error("인페인팅 실패 - 상태 코드:", inpaintResponse.status);
            console.error("인페인팅 오류 응답:", inpaintResponse.data.toString());
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: '이미지 생성 중 오류가 발생했습니다.',
                    status: inpaintResponse.status 
                })
            };
        }

    } catch (error) {
        console.error("전체 프로세스 오류:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: '서버 오류가 발생했습니다.', details: error.message })
        };
    } finally {
    }
};